# AWS RDS Setup Guide

## Database Configuration for AWS RDS

The application has been updated to support AWS RDS PostgreSQL with SSL connections. Here's how to configure your environment variables:

### Option 1: Using DATABASE_URL (Recommended)

Add this to your `.env` file:

```env
DATABASE_URL=postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/database_name?sslmode=require
```

### Option 2: Using Individual Variables

Add these to your `.env` file:

```env
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=raci
DB_USER=postgres
DB_PASSWORD=your_password
```

### Required Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/database_name?sslmode=require

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
REFRESH_TOKEN_EXPIRE=7d

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
AWS_S3_BASE_URL=https://your-s3-bucket-name.s3.amazonaws.com/

# Application Configuration
NODE_ENV=production
PORT=9100
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### Testing the Connection

Run the test script to verify your database connection:

```bash
node scripts/test-db-connection.js
```

### Important Notes

1. **SSL is Required**: AWS RDS PostgreSQL requires SSL connections. The application automatically detects this and enables SSL.

2. **Environment Detection**: The app automatically enables SSL when:
   - `NODE_ENV=production` is set
   - The database host contains `rds.amazonaws.com`

3. **Connection String**: When using `DATABASE_URL`, make sure to include `?sslmode=require` at the end.

4. **Security Groups**: Ensure your AWS RDS security group allows connections from your application's IP address on port 5432.

### Troubleshooting

If you still get connection errors:

1. Check that your RDS instance is publicly accessible (if connecting from outside AWS)
2. Verify your security group settings
3. Ensure the database credentials are correct
4. Check that the database name exists
5. Verify the endpoint URL is correct 