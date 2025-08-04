const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Delete a file from S3
 * @param {string} key - The S3 key of the file to delete
 * @returns {Promise} - Promise that resolves when file is deleted
 */
const deleteFileFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });
    
    await s3Client.send(command);
    console.log(`File deleted from S3: ${key}`);
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

/**
 * Generate S3 URL from file path
 * @param {string} filePath - The file path stored in database
 * @returns {string} - Local uploads format URL
 */
const generateS3Url = (filePath) => {
  if (!filePath) return null;
  
  // If it's already a full URL, return as is
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // If it's already in uploads format, return as is
  if (filePath.startsWith('/uploads/')) {
    return filePath;
  }
  
  // If it's a key (like raci/company/logos/filename.png), convert to uploads format
  // Extract just the filename from the path
  const filename = filePath.split('/').pop();
  return `/uploads/${filename}`;
};

/**
 * Generate presigned URL for private files
 * @param {string} key - The S3 key of the file
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise<string>} - Presigned URL
 */
const generatePresignedUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

/**
 * Extract S3 key from file path or URL
 * @param {string} filePath - The file path or URL
 * @returns {string} - S3 key
 */
const extractS3Key = (filePath) => {
  if (!filePath) return null;
  
  // If it's a full S3 URL, extract the key
  if (filePath.includes('amazonaws.com')) {
    const urlParts = filePath.split('/');
    const bucketIndex = urlParts.findIndex(part => part.includes('amazonaws.com'));
    return urlParts.slice(bucketIndex + 1).join('/');
  }
  
  // If it's a relative path, remove /uploads/ prefix
  if (filePath.startsWith('/uploads/')) {
    return filePath.replace('/uploads/', '');
  }
  
  // If it's already a key, return as is
  return filePath;
};

/**
 * Get organized file structure for a company inside raci/ folder
 * @param {string} companyName - The company name
 * @returns {Object} - File structure object
 */
const getCompanyFileStructure = (companyName) => {
  const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return {
    logos: `raci/${sanitizedCompanyName}/logos/`,
    photos: `raci/${sanitizedCompanyName}/photos/`,
    documents: `raci/${sanitizedCompanyName}/documents/`,
    images: `raci/${sanitizedCompanyName}/images/`
  };
};

/**
 * Generate file URL based on company and file type inside raci/ folder
 * @param {string} companyName - The company name
 * @param {string} fileType - The type of file (logos, photos, documents, images)
 * @param {string} fileName - The file name
 * @returns {string} - Full S3 URL
 */
const generateCompanyFileUrl = (companyName, fileType, fileName) => {
  const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const key = `raci/${sanitizedCompanyName}/${fileType}/${fileName}`;
  
  // Check if base URL already ends with /raci/ to avoid duplication
  const baseUrl = process.env.AWS_S3_BASE_URL;
  if (baseUrl && baseUrl.endsWith('/raci/')) {
    return `${baseUrl}${sanitizedCompanyName}/${fileType}/${fileName}`;
  } else {
    return `${baseUrl}${key}`;
  }
};

/**
 * Generate complete file URLs for company files
 * @param {string} companyName - The company name
 * @param {Object} files - Object containing file information
 * @returns {Object} - Object with file URLs
 */
const generateCompanyFileUrls = (companyName, files) => {
  const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const baseUrl = process.env.AWS_S3_BASE_URL;
  
  // Check if base URL already ends with /raci/ to avoid duplication
  const raciPath = baseUrl && baseUrl.endsWith('/raci/') ? '' : 'raci/';
  
  return {
    logos: files.logos ? `${baseUrl}${raciPath}${sanitizedCompanyName}/logos/${files.logos}` : null,
    photos: files.photos ? `${baseUrl}${raciPath}${sanitizedCompanyName}/photos/${files.photos}` : null,
    documents: files.documents ? `${baseUrl}${raciPath}${sanitizedCompanyName}/documents/${files.documents}` : null,
    images: files.images ? `${baseUrl}${raciPath}${sanitizedCompanyName}/images/${files.images}` : null
  };
};

module.exports = {
  deleteFileFromS3,
  generateS3Url,
  generatePresignedUrl,
  extractS3Key,
  getCompanyFileStructure,
  generateCompanyFileUrl,
  generateCompanyFileUrls
}; 