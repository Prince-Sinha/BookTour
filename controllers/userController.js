const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');


// const multerStorage = multer.diskStorage({ 
//   destination : (req,file,cb)=>{
//     cb(null, 'public/img/users')
//   },
//   filename : (req,file,cb)=>{
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user._id}-${Date.now()}.${ext}`)
//   }
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req,file,cb)=>{
  if(file.mimetype.startsWith('image')){
    cb(null,true);
  }else{
    cb(new AppError('Not an image ! Please upload an image',400),false);

  }
}

const upload = multer({
   storage : multerStorage,
   fileFilter : multerFilter
})

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = (req,res,next)=>{
  if(req.file) return next();
  
  req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;

  // sharp(req.file.buffer).resize(500,500).toFormat('jpeg').jpeg({
  //   quality : 90
  // }).toFile(req.file.filename);
  next();
}


// exports.getAllUsers =catchAsync(async (req, res) => {
//   const users = await User.find();
  
//   res.status(500).json({
//     status: 'success',
//     users
//   });
// });

const filterObj = (obj,...rest)=>{
  const newObj={};
  // for looping object
  Object.keys(obj).forEach(el=>{
    if(rest.includes(el)) newObj[el]=obj[el];
  })
  return newObj;
}

exports.getMe = (req,res,next)=>{
  req.params.id = req.user.id;
  next();
}
exports.updateMe = catchAsync(async (req, res, next)=>{
  // 1) Create error if user POSTed password data
  if(req.body.password || req.body.ConfirmPassword){
    return next(new AppError('This is route is not for update password . Please use /updatePassword',400));
  }

  // 2) Update user document
  // filter out unwanted feild name that are not allowed
  const filterBody = filterObj(req.body,'email','name');
  if(req.file) filterBody.photo = req.file.filename

  const updatedUser= await User.findByIdAndUpdate(req.user.id,filterBody,{ new : true, runValidators: true});
  res.status(200).json({
    status : 'success',
    data : updatedUser
  })
});

exports.deleteMe = catchAsync(async (req,res,next)=>{
    await User.findByIdAndUpdate(req.user.id,{active : false});

    res.status(204).json({
      status : 'success',
      data : null
    })
});


exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined!/Please use /signup '
  });
};
// Do Not TRY to change password with 
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);


