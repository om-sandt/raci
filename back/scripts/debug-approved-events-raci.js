const axios = require('axios');

async function debugApprovedEventsRaci() {
  try {
    console.log('=== DEBUGGING APPROVED EVENTS FOR RACI ASSIGNMENT ===');
    
    // Test if server is running
    console.log('\n1. Testing server connectivity...');
    try {
      const response = await axios.get('http://localhost:9100/', { timeout: 5000 });
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not responding:', error.message);
      return;
    }
    
    // Test getting approved events (without auth - should return 401)
    console.log('\n2. Testing approved events endpoint...');
    try {
      const response = await axios.get('http://localhost:9100/api/events?status=APPROVED&limit=5', { timeout: 5000 });
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Approved events endpoint is working (requires authentication)');
      } else if (error.response && error.response.status === 500) {
        console.log('❌ Approved events endpoint has an error:', error.response.data);
      } else {
        console.log('❌ Approved events endpoint error:', error.message);
      }
    }
    
    // Test getting approved events with lowercase status
    console.log('\n3. Testing approved events with lowercase status...');
    try {
      const response = await axios.get('http://localhost:9100/api/events?status=approved&limit=5', { timeout: 5000 });
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Approved events endpoint with lowercase is working (requires authentication)');
      } else if (error.response && error.response.status === 500) {
        console.log('❌ Approved events endpoint with lowercase has an error:', error.response.data);
      } else {
        console.log('❌ Approved events endpoint with lowercase error:', error.message);
      }
    }
    
    // Test RACI assignments endpoint
    console.log('\n4. Testing RACI assignments endpoint...');
    try {
      const response = await axios.get('http://localhost:9100/api/raci-tracker/company', { timeout: 5000 });
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ RACI assignments endpoint is working (requires authentication)');
      } else if (error.response && error.response.status === 500) {
        console.log('❌ RACI assignments endpoint has an error:', error.response.data);
      } else {
        console.log('❌ RACI assignments endpoint error:', error.message);
      }
    }
    
    // Test RACI dashboard endpoint
    console.log('\n5. Testing RACI dashboard endpoint...');
    try {
      const response = await axios.get('http://localhost:9100/api/dashboard/raci', { timeout: 5000 });
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ RACI dashboard endpoint is working (requires authentication)');
      } else if (error.response && error.response.status === 500) {
        console.log('❌ RACI dashboard endpoint has an error:', error.response.data);
      } else {
        console.log('❌ RACI dashboard endpoint error:', error.message);
      }
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    console.log('If all endpoints return 401 (Unauthorized), the server is working correctly.');
    console.log('The issue might be in the frontend filtering or the specific RACI assignment logic.');
    
  } catch (error) {
    console.error('Error in debug:', error.message);
  }
}

debugApprovedEventsRaci(); 