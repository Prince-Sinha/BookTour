const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewController = require('./../controllers/reviewController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// router.param('id', tourController.checkID);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(authController.protect, authController.requestTo('admin', 'lead-guide','guide'),tourController.getMonthlyPlan);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin) ;

router
  .route('/distances/:latlng/unit/:unit')
  .get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(authController.protect,authController.requestTo('admin','lead-guide'),tourController.createTour);
  // .delete(tourController.deleteMa);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(authController.protect, authController.requestTo('admin', 'lead-guide'),tourController.updateTour)
  .delete(authController.protect, authController.requestTo('admin', 'lead-guide'),tourController.deleteTour);

// GET /tours/24u43ur4/reviews;
// router
//   .route('/:tourId/reviews')
//   .post(authController.protect,authController.requestTo('user'),reviewController.createReview);

router.use('/:tourId/reviews',reviewRouter);

module.exports = router;

