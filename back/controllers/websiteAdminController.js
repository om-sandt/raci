const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { generateToken, generateRefreshToken } = require('../utils/jwtUtils');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// @desc    Get all website admins
// @route   GET /api/website-admins
// @access  Private (website_admin)
exports.getWebsiteAdmins = async (req, res, next) => {
  try {
    const admins = await prisma.websiteAdmin.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json(admins);
  } catch (error) {
    next(error);
  }
};

// @desc    Get website admin by ID
// @route   GET /api/website-admins/:id
// @access  Private (website_admin)
exports.getWebsiteAdminById = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.id);
    
    const admin = await prisma.websiteAdmin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Website admin not found'
      });
    }

    res.status(200).json(admin);
  } catch (error) {
    next(error);
  }
};

// @desc    Create website admin
// @route   POST /api/website-admins
// @access  Private (website_admin)
exports.createWebsiteAdmin = async (req, res, next) => {
  try {
    const { fullName, email, phone, password } = req.body;
    let photoUrl = null;

    // Handle photo upload if provided
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    // Check if admin with this email already exists
    const existingAdmin = await prisma.websiteAdmin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      // If there was a file upload and an error occurs, clean up the uploaded file
      if (req.file) {
        fs.unlink(req.file.path, err => {
          if (err) console.error('Failed to delete uploaded file:', err);
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin
    const admin = await prisma.websiteAdmin.create({
      data: {
        fullName,
        email,
        phone,
        password: hashedPassword,
        photo: photoUrl
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        photo: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: admin
    });
  } catch (error) {
    // If there was a file upload and an error occurs, clean up the uploaded file
    if (req.file) {
      fs.unlink(req.file.path, err => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }
    next(error);
  }
};

// @desc    Update website admin
// @route   PUT /api/website-admins/:id
// @access  Private (website_admin)
exports.updateWebsiteAdmin = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.id);
    const { fullName, phone } = req.body;
    let photoUrl = undefined;

    // Handle photo upload if provided
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
      
      // Check if admin exists and has a previous photo
      const existingAdmin = await prisma.websiteAdmin.findUnique({
        where: { id: adminId },
        select: { photo: true }
      });

      if (existingAdmin && existingAdmin.photo) {
        // Delete previous photo file if it exists
        const oldPhotoPath = path.join(__dirname, '..', existingAdmin.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
    }

    // Check if admin exists
    const existingAdmin = await prisma.websiteAdmin.findUnique({
      where: { id: adminId }
    });

    if (!existingAdmin) {
      // If there was a file upload and an error occurs, clean up the uploaded file
      if (req.file) {
        fs.unlink(req.file.path, err => {
          if (err) console.error('Failed to delete uploaded file:', err);
        });
      }
      return res.status(404).json({
        success: false,
        message: 'Website admin not found'
      });
    }

    // Update admin
    const admin = await prisma.websiteAdmin.update({
      where: { id: adminId },
      data: {
        fullName: fullName || undefined,
        phone: phone || undefined,
        photo: photoUrl
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        photo: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    // If there was a file upload and an error occurs, clean up the uploaded file
    if (req.file) {
      fs.unlink(req.file.path, err => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }
    next(error);
  }
};

// @desc    Delete website admin
// @route   DELETE /api/website-admins/:id
// @access  Private (website_admin)
exports.deleteWebsiteAdmin = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.id);

    // Check if admin exists
    const existingAdmin = await prisma.websiteAdmin.findUnique({
      where: { id: adminId }
    });

    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Website admin not found'
      });
    }

    // Check if this is the last admin
    const adminCount = await prisma.websiteAdmin.count();
    
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last website admin'
      });
    }

    // Delete admin
    await prisma.websiteAdmin.delete({
      where: { id: adminId }
    });

    res.status(200).json({
      success: true,
      message: 'Website admin deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Website admin login
// @route   POST /api/website-admins/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if admin exists
    const admin = await prisma.websiteAdmin.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const token = generateToken(admin.id);
    const refreshToken = generateRefreshToken(admin.id);

    res.status(200).json({
      token,
      refreshToken,
      user: {
        id: admin.id,
        name: admin.fullName,
        email: admin.email,
        role: 'website_admin',
        phone: admin.phone,
        photo: admin.photo
      }
    });
  } catch (error) {
    next(error);
  }
};
