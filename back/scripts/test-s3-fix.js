require('dotenv').config();
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testS3Connection() {
  try {
    console.log('🔍 Testing S3 connection with AWS SDK v3...');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set');
    
    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    
    // Test connection by listing buckets
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('✅ S3 connection successful!');
    console.log('Available buckets:', response.Buckets?.map(b => b.Name) || []);
    console.log('Target bucket:', process.env.AWS_S3_BUCKET);
    
    // Check if target bucket exists
    const targetBucket = response.Buckets?.find(b => b.Name === process.env.AWS_S3_BUCKET);
    if (targetBucket) {
      console.log('✅ Target bucket found!');
    } else {
      console.log('⚠️ Target bucket not found in list');
    }
    
  } catch (error) {
    console.error('❌ S3 connection test failed:', error.message);
    console.error('Error details:', error);
  }
}

testS3Connection(); 