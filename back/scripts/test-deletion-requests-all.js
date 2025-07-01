const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const ADMIN_TOKEN = 'your-admin-token-here'; // Replace with actual admin token

async function testGetAllDeletionRequests() {
  try {
    console.log('Testing GET /api/companies/deletion-requests/all...');
    
    const response = await axios.get(`${BASE_URL}/companies/deletion-requests/all`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && Array.isArray(response.data.data)) {
      console.log(`📊 Found ${response.data.data.length} deletion requests`);
      
      // Show summary of requests by status
      const statusCount = {};
      response.data.data.forEach(request => {
        statusCount[request.status] = (statusCount[request.status] || 0) + 1;
      });
      
      console.log('📈 Status breakdown:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing getAllDeletionRequests:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testGetAllDeletionRequests(); 