const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  signup,
  signin,
  verifyOTP,
  resendOTP,
  getCurrentUser
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validation rules
const signupValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('fullName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name is required and cannot exceed 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email')
    .matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)
    .withMessage('Please enter a valid Gmail address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

const signinValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const verifyOTPValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must be numeric')
];

const resendOTPValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email')
];

// Routes
router.post('/signup', signupValidation, handleValidationErrors, signup);
router.post('/signin', signinValidation, handleValidationErrors, signin);
router.post('/verify-otp', verifyOTPValidation, handleValidationErrors, verifyOTP);
router.post('/resend-otp', resendOTPValidation, handleValidationErrors, resendOTP);
router.get('/me', protect, getCurrentUser);

module.exports = router;
