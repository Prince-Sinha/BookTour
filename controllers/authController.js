const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const { promisify }= require('util');
const sendEmail = require('./../utils/email');
const crypto = require('crypto');

const signToken = (id)=>{
    return jwt.sign({ id : id},process.env.JWT_SECRET,{
        expiresIn : process.env.JWT_EXPIRE_IN,
      });
} 
const createSendToken = (user, StatusCode, res)=>{
    const token = signToken(user._id);

    const cookieOption = {
      expires : new Date(Date.now() + process.env.COOKIE_EXPIRE_TIME*24*60*60*1000),
      httpOnly : true
    }
    if(process.env.NODE_ENV === 'production') cookieOption.secure = true;
    
    res.cookie('jwt',token,cookieOption);

    //Remove the password from the output
    user.password=undefined;
    
    res.status(StatusCode).json({
        status : 'Success',
        token,
        data : {
            user : user
        }
    });
}

exports.signup = catchAsync( async (req,res,next)=>{
    const newUser = await User.create({
        name : req.body.name,
        email : req.body.email,
        password : req.body.password,
        ConfirmPassword : req.body.ConfirmPassword,
        role : req.body.role
    });

    createSendToken(newUser,201,res);
});

exports.login = catchAsync( async (req,res,next)=>{
    const {email , password} = req.body;

    // 1) check email and password exist 
    if(!email || !password){
        return next(new AppError(`Please Provide ${!email?'email':'password'} `, 404))
    }

    /// 2) check if user exsit or not
    const user = await User.findOne({email : email}).select('+password');

    if(!user || !await user.CorrectPassword(password, user.password)){
        return next(new AppError('Incorrect Email or Password',401));
    }

    // 3) If everything is ok sent token to client
    createSendToken(user,201,res);

});

exports.protect = catchAsync( async (req,res,next)=>{
   // 1) Getting token and check's it's valid or not
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ').at(-1);
    }else if(req.cookies.jwt){
      token = req.cookies.jwt;
    }
    // console.log(token);
    if(!token){
        return next(new AppError('You are not logged in',401))
    }

   // 2) Verification Token
    const decoded = await promisify(jwt.verify)(token , process.env.JWT_SECRET); // give user id
    // console.log(decode);
    
   // 3) check if user still exist
   const freshuser = await User.findById(decoded.id);
   if(!freshuser){
     return next(new AppError('User belonging to this token do not exist',401));
   }


   // 4) If your user changed the password after the token is issued
   if(freshuser.ChangedPasswordAfter(decoded.iat)){
     return next(new AppError('User Changed the Password Please Login Again',401));
   }

   // Grant ACCESS to PROTECTED ROUTE
   req.user = freshuser;
   next();
});

exports.isLoggedIn = catchAsync( async (req,res,next)=>{
  
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
});

exports.requestTo = function(...roles){
    return (req,res,next)=>{
        if(!roles.includes(req.user.role)){
            return next(new AppError("You do'nt have permission to perform this",403))
        }
        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError('There is no user with email address.', 404));
    }
  
    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
  
    // 3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
  
    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;
  
    
      await sendEmail({
        email: user.email,
        subject: 'Your password reset token (valid for 10 min)',
        message
      });
  
      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
      });
    
  });

  exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    console.log(user);
  
    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.ConfirmPassword = req.body.ConfirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  
    // 3) Update changedPasswordAt property for the user
      // - Done through using pre middleware(Document Middleware)

    // 4) Log the user in, send JWT
    createSendToken(user,200,res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');
  
    // 2) Check if POSTed current password is correct
    if (!(await user.CorrectPassword(req.body.passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }
  
    // 3) If so, update password
    user.password = req.body.password;
    user.ConfirmPassword = req.body.ConfirmPassword;
    await user.save();
    // User.findByIdAndUpdate will NOT work as intended!
  
    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
} );