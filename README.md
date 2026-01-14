# CyberShield Authentication API

A Node.js API server with Gmail authentication, OTP verification, and MongoDB storage.

## Features

- ✅ Sign up with Gmail ID
- ✅ Email verification via OTP
- ✅ Unique username validation
- ✅ Sign in/Sign up functionality
- ✅ JWT-based authentication
- ✅ MongoDB storage
- ✅ Only verified users can login

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Gmail account with App Password enabled

## Installation

1. Clone the repository and navigate to the project directory:
```bash
cd cybershield
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/cybershield
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

## Gmail App Password Setup

To send OTP emails, you need to create a Gmail App Password:

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate a new app password for "Mail"
5. Use this password in your `.env` file as `EMAIL_PASSWORD`

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in `.env`).

## API Endpoints

### 1. Sign Up
**POST** `/api/auth/signup`

Request body:
```json
{
  "username": "johndoe",
  "fullName": "John Doe",
  "email": "johndoe@gmail.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for OTP verification.",
  "data": {
    "userId": "...",
    "username": "johndoe",
    "email": "johndoe@gmail.com",
    "isEmailVerified": false
  }
}
```

### 2. Verify OTP
**POST** `/api/auth/verify-otp`

Request body:
```json
{
  "email": "johndoe@gmail.com",
  "otp": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "...",
      "username": "johndoe",
      "fullName": "John Doe",
      "email": "johndoe@gmail.com",
      "isEmailVerified": true
    }
  }
}
```

### 3. Resend OTP
**POST** `/api/auth/resend-otp`

Request body:
```json
{
  "email": "johndoe@gmail.com"
}
```

### 4. Sign In / Login
**POST** `/api/auth/signin`

Request body:
```json
{
  "email": "johndoe@gmail.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Sign in successful",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "...",
      "username": "johndoe",
      "fullName": "John Doe",
      "email": "johndoe@gmail.com",
      "isEmailVerified": true
    }
  }
}
```

### 5. Get Current User (Protected)
**GET** `/api/auth/me`

Headers:
```
Authorization: Bearer <jwt-token>
```

### 6. Health Check
**GET** `/health`

## Validation Rules

- **Username**: 3-30 characters, alphanumeric and underscores only, must be unique
- **Full Name**: 1-100 characters, not required to be unique
- **Email**: Must be a valid Gmail address (@gmail.com), must be unique
- **Password**: Minimum 6 characters
- **OTP**: 6-digit numeric code, expires in 10 minutes

## Security Features

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Email verification required before login
- OTP expiration (10 minutes)
- Input validation and sanitization

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error message here",
  "errors": [] // For validation errors
}
```

## Project Structure

```
cybershield/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── validation.js        # Validation error handler
├── models/
│   └── User.js              # User schema/model
├── routes/
│   └── auth.js              # Authentication routes
├── utils/
│   └── emailService.js      # Email/OTP service
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── README.md
└── server.js                # Main server file
```

## License

ISC
