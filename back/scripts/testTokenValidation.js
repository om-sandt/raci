/**
 * Script to test token generation and validation
 * Run with: node scripts/testTokenValidation.js
 */
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const logger = require('../utils/logger');
const { generateToken } = require('../utils/jwtUtils');

// Load environment variables
dotenv.config();

function testToken() {
  try {
    console.log('===== TOKEN VALIDATION TEST =====');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set properly' : 'NOT SET!');
    
    // Generate a test token
    const testId = 999;
    const token = generateToken(testId);
    console.log('Test token generated');
    console.log('Token preview:', `${token.substring(0, 15)}...${token.substring(token.length - 15)}`);
    
    // Try to decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    
    if (decoded.id === testId) {
      console.log('✅ SUCCESS: Token validation works!');
    } else {
      console.log('❌ FAILURE: Token ID mismatch!');
    }
    
    // Try to decode with wrong secret
    try {
      jwt.verify(token, 'wrong-secret');
      console.log('❌ FAILURE: Token validated with wrong secret!');
    } catch (err) {
      console.log('✅ SUCCESS: Token rejected with wrong secret!');
    }
    
    console.log('Test complete!');
  } catch (error) {
    console.error('Error during token test:', error);
  }
}

testToken();
