const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema({
    review : {
        type : String,
        require : [true,'Review should not be empty']
    },
    rating : {
        type : Number,
        default : 4.5,
        min : 1,
        max : 5,
        set : val => Math.round(val*10)/10
    },
    createdAt : {
        type : Date,
        default : Date.now()
    },
    tour : {
        type : mongoose.Schema.ObjectId,
        ref : 'Tour',
        requied :[true, 'Review must belong to Tour']
    },
    user : {
        type : mongoose.Schema.ObjectId,
        ref : 'User',
        required : [true, 'Review must have User']
    }
},{
    toJSON : {virtuals : true},
    toObject : {virtuals : true}
});

reviewSchema.pre(/^find/, function(next){
    // this.populate({
    //     path : 'tour',
    //     select : 'name'
    // }).populate({
    //     path : 'user',
    //     select : 'name photo'
    // });
    // next();
    this.populate({
            path : 'user',
            select : 'name photo'
    });
    next();
})

reviewSchema.statics.calcsAverageRating = async function(tourId){
    const stat = await this.aggregate([
        {
            $match : { tour : tourId }
        },
        {
           $group : {
            _id : '$tour',
            nRating : { $sum : 1},
            avgRating : { $avg : '$rating'}
           }
        }
    ]);

    if(stat.length > 0){
        await Tour.findByIdAndUpdate(tourId, {
            ratingsAverage : stat[0].avgRating,
            ratingsQuantity : stat[0].nRating
        });
    }else {
      await Tour.findByIdAndUpdate(tourId, {
          ratingsAverage : 4.5,
          ratingsQuantity : 0
      });
   }

};

reviewSchema.index( { tour : 1 , review : 1}, {unique : true});

reviewSchema.post('save', function(){
    this.constructor.calcsAverageRating(this.tour);
    
});

reviewSchema.pre(/^findOneAnd/, async function(next){
    this.r = await this.findOne();
    console.log(this.r);
    next();
});

reviewSchema.post(/^findOneAnd/ , async function(){
    await this.r.constructor.calcsAverageRating(this.r.tour);
})

const Review = mongoose.model('Review',reviewSchema);
module.exports = Review;