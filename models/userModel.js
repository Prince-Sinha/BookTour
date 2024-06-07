const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    name:{
        type: String,
        required : [true, 'Name is Required'],
        
    },
    photo : {
        type : String,
        default : 'default.jpg'
    },
    email : {
        type : String,
        required : [true,'Email is required'],
        unique : true,
        validate : [validator.isEmail,'Enter the valid Email Id']
    },
    password : {
        type : String,
        required : [true, 'Required'],
        minlength : 8,
        select : false
    },
    ConfirmPassword : {
        type : String,
        required : [true, 'Required'],
        validate : {
            // This only work on SAVE and CREATE
            validator : function(val){
                return this.password === val
            },
            message : "Password does not match"
        }
    },
    role : {
        type : String,
        enum : ['user','admin', 'guide', 'lead-guide'],
        default : 'user'
    },
    PasswordChangedAt : {
        type :Date,
        default : Date.now()
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active : {
        type : Boolean,
        default : true,
        select : false
    }
});

UserSchema.pre('save', function(next){
    if(!this.isModified('password') || this.isNew) return next();

    this.PasswordChangedAt = Date.now()-1000;
    next();
})

UserSchema.pre('save', async function(next){
    //
   if(!this.isModified('password')) return next();

   this.password = await bcrypt.hash(this.password,12);
   this.ConfirmPassword = undefined;
   next();

});

UserSchema.pre(/^find/,function(next){
    this.find({active : {$ne : false}});
    next();
})

UserSchema.methods.CorrectPassword = async (CandidatePassword, UserPassword)=>{
    return await bcrypt.compare(CandidatePassword,UserPassword);
}//--> Available on all instance of User i.e on document

UserSchema.methods.ChangedPasswordAfter = function(JWTTimeStamp){
    if(this.PasswordChangedAt){
        const time = parseInt(this.PasswordChangedAt.getTime()/1000,10);
        return (JWTTimeStamp < time);
    }
    return false; 
}



UserSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
  
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
  
    console.log({ resetToken }, this.passwordResetToken);
  
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
};
  

const User = mongoose.model('User', UserSchema);

module.exports = User;