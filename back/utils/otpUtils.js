const crypto = require('crypto');
const logger = require('./logger');

// Store OTPs in memory with expiry time
const otpStore = new Map();

// Generate a random OTP
exports.generateOTP = (email) => {
  // Generate a 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // Store OTP with 15-minute expiry
  const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  otpStore.set(email, { otp, expiry });
  
  logger.debug(`Generated OTP for ${email}: ${otp}`);
  
  return otp;
};

// Verify an OTP
exports.verifyOTP = (email, userOtp) => {
  const otpData = otpStore.get(email);
  
  // Check if OTP exists and is valid
  if (!otpData) {
    logger.debug(`No OTP found for ${email}`);
    return false;
  }
  
  // Check if OTP has expired
  if (Date.now() > otpData.expiry) {
    logger.debug(`OTP for ${email} has expired`);
    otpStore.delete(email); // Clean up expired OTP
    return false;
  }
  
  // Check if OTP matches
  const isMatch = otpData.otp === userOtp;
  logger.debug(`OTP verification for ${email}: ${isMatch ? 'successful' : 'failed'}`);
  
  // If verified successfully, delete the OTP
  if (isMatch) {
    otpStore.delete(email);
  }
  
  return isMatch;
};

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  otpStore.forEach((value, key) => {
    if (now > value.expiry) {
      otpStore.delete(key);
    }
  });
}, 30 * 60 * 1000); // Run every 30 minutes
