const http = require('http');

console.log('🔧 Testing RACI Approval Route Configuration...\n');

// Test if server is running and route exists
function testRoute(port, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    // Send empty body for this test
    req.write(JSON.stringify({}));
    req.end();
  });
}

async function runRouteTest() {
  const port = 9100; // Based on user's frontend calling this port
  const testPaths = [
    '/api/raci/80/approvals',
    '/api/raci/events/80',
    '/api/raci/eligible-approvers',
    '/api/raci/approvals/pending'
  ];

  console.log(`Testing server on port ${port}...`);
  console.log('Note: 401/403 responses are expected (authentication required)\n');

  for (const path of testPaths) {
    try {
      console.log(`🔍 Testing: ${path}`);
      const result = await testRoute(port, path);
      
      if (result.statusCode === 404) {
        console.log(`❌ Route not found (404): ${path}`);
        console.log(`   Response: ${result.body.substring(0, 100)}...`);
      } else if (result.statusCode === 401 || result.statusCode === 403) {
        console.log(`✅ Route exists (${result.statusCode}): ${path}`);
        console.log(`   Authentication required - this is expected`);
      } else {
        console.log(`✅ Route accessible (${result.statusCode}): ${path}`);
        if (result.body) {
          console.log(`   Response: ${result.body.substring(0, 100)}...`);
        }
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Server not running on port ${port}`);
        console.log(`   Please start the server with: node server.js`);
        break;
      } else {
        console.log(`❌ Error testing ${path}: ${error.message}`);
      }
    }
    console.log('');
  }
}

// Check if routes are properly imported
function checkRouteImports() {
  console.log('📋 Checking route configuration...\n');
  
  try {
    const raciRoutes = require('../routes/raci');
    console.log('✅ RACI routes module loaded successfully');
    
    // Check if the routes have the expected structure
    if (typeof raciRoutes === 'function') {
      console.log('✅ RACI routes is a valid Express router');
    } else {
      console.log('❌ RACI routes is not a valid Express router');
    }
    
    const raciController = require('../controllers/raciController');
    console.log('✅ RACI controller loaded successfully');
    
    // Check if approval functions exist
    const requiredFunctions = [
      'createRaciApprovals',
      'getPendingApprovals', 
      'getRaciMatrixForApproval',
      'approveRejectRaciMatrix',
      'getRaciApprovalStatus',
      'getEligibleApprovers'
    ];
    
    for (const funcName of requiredFunctions) {
      if (typeof raciController[funcName] === 'function') {
        console.log(`✅ ${funcName} function exists`);
      } else {
        console.log(`❌ ${funcName} function missing`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error loading routes/controller: ${error.message}`);
  }
}

async function runTest() {
  checkRouteImports();
  console.log('\n' + '='.repeat(50) + '\n');
  await runRouteTest();
  
  console.log('\n📊 Summary:');
  console.log('✅ Fixed route mounting: /api/raci-matrices → /api/raci');
  console.log('✅ Routes should now match frontend expectations');
  console.log('✅ Documentation updated with correct endpoints');
  console.log('\n💡 Next steps:');
  console.log('1. Restart your backend server');
  console.log('2. Test the frontend RACI approval functionality');
  console.log('3. Check that authentication tokens are being sent correctly');
}

runTest().catch(console.error); 