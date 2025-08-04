const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');

// Configure AWS S3 with v3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images, PDFs, and office documents
  const allowedFileTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx/;
  const extname = allowedFileTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  
  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, and office documents are allowed!'), false);
  }
};

// Configure S3 storage
const s3Storage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_S3_BUCKET,
  // Remove ACL since bucket doesn't allow ACLs
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    // Get company ID or name from request
    const companyId = req.user?.company_id || req.body.companyId || 'default';
    const companyName = req.body.companyName || req.body.name || 'default';
    
    // Create unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    
    // Determine file type based on fieldname or file extension
    let fileType = 'documents';
    if (file.fieldname === 'logo' || file.fieldname === 'projectLogo') {
      fileType = 'logos';
    } else if (file.fieldname === 'photo') {
      fileType = 'photos';
    } else if (ext.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) {
      fileType = 'documents';
    } else if (ext.match(/\.(jpg|jpeg|png|gif)$/i)) {
      fileType = 'images';
    }
    
    // Store in organized folder structure: raci/company-name/file-type/filename
    const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const key = `raci/${sanitizedCompanyName}/${fileType}/${filename}`;
    cb(null, key);
  }
});

// Create multer upload instance
const s3Upload = multer({
  storage: s3Storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 5242880) // Default 5MB
  }
});

module.exports = s3Upload; 