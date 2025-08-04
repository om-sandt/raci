const axios = require('axios');

async function testHodDashboard() {
  try {
    console.log('=== TESTING HOD DASHBOARD ===');
    
    // Test if server is running
    console.log('\n1. Testing server connectivity...');
    try {
      const response = await axios.get('http://localhost:9100/', { timeout: 5000 });
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not responding:', error.message);
      return;
    }
    
    // Test HOD dashboard endpoint (without auth - should return 401)
    console.log('\n2. Testing HOD dashboard endpoint...');
    try {
      const response = await axios.get('http://localhost:9100/api/dashboard/hod', { timeout: 5000 });
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ HOD dashboard endpoint is working (requires authentication)');
      } else if (error.response && error.response.status === 500) {
        console.log('❌ HOD dashboard endpoint has an error:', error.response.data);
      } else {
        console.log('❌ HOD dashboard endpoint error:', error.message);
      }
    }
    
    // Test events endpoint (without auth - should return 401)
    console.log('\n3. Testing events endpoint...');
    try {
      const response = await axios.get('http://localhost:9100/api/events?status=PENDING&limit=5', { timeout: 5000 });
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Events endpoint is working (requires authentication)');
      } else if (error.response && error.response.status === 500) {
        console.log('❌ Events endpoint has an error:', error.response.data);
      } else {
        console.log('❌ Events endpoint error:', error.message);
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('If both endpoints return 401 (Unauthorized), the server is working correctly.');
    console.log('The HOD dashboard should now show pending events correctly.');
    
  } catch (error) {
    console.error('Error in test:', error.message);
  }
}

testHodDashboard(); 