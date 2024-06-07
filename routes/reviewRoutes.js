const reviewController = require('./../controllers/reviewController');
const authContoller = require('./../controllers/authController');
const express = require('express');

const router = express.Router({ mergeParams : true });

router.use(authContoller.protect);

router
   .route('/')
   .get(reviewController.getAllReviews)
   .post(authContoller.requestTo('user')
    ,reviewController.setTourAndUserId
    ,reviewController.createReview);

router
   .route('/:id')
   .get(reviewController.getReview)
   .patch(authContoller.requestTo('user'),reviewController.updateReview)
   .delete(authContoller.requestTo('user'),reviewController.deleteReview);


module.exports = router;