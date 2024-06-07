const path = require('path');
const express = require('express');
const morgan = require('morgan');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const cookieParser = require('cookie-parser');

const fs = require('fs');
const Tour = require('./models/tourModel');
// const xssclean = require('xss-clean');
const hpp = require('hpp');

const app = express();

app.set('view engine', 'pug');
app.set('views' , path.join(__dirname , 'views'));
app.use(express.static(path.join(__dirname , 'public' )));



// Global Middleware
// Set Security HTTP Headwr
// app.use(helmet());


// Limit request from the same API
const limiter = rateLimit({
  max : 100,
  windowMs : 60*60*1000,
  message : 'Too many request from this IP.Please try after an hour'
});

app.use('/api',limiter);

// Data Sanitization aganist NoSQL query injection
app.use(mongoSanitize());

// Data Sanitixation aganis xss
// app.use(xssclean());

//Prevent parament pollution
app.use(hpp({
  whitelist : ['duration', 'ratingsAverage','ratingsQuantity','price','difficulty','maxGroupSize']
}))

// 1) MIDDLEWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


// Body Parser, reading data from the body into req.body
app.use(express.json());
app.use(cookieParser());

// Servering static file


app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.header);
  console.log(req.cookies);
  
  next();
});




// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
