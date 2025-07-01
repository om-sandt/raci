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
    let admins;
    try {
      // Try with new field
      admins = await prisma.websiteAdmin.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          canCreateAdmins: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      // Fallback without new field
      admins = await prisma.websiteAdmin.findMany({
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
      // Add default canCreateAdmins field
      admins = admins.map(admin => ({
        ...admin,
        canCreateAdmins: admin.email === 'omvataliya23@gmail.com'
      }));
    }

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
    
    let admin;
    try {
      // Try with new field
      admin = await prisma.websiteAdmin.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          canCreateAdmins: true,
          createdAt: true
        }
      });
    } catch (error) {
      // Fallback without new field
      admin = await prisma.websiteAdmin.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true
        }
      });
      if (admin) {
        admin.canCreateAdmins = admin.email === 'omvataliya23@gmail.com';
      }
    }

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
// @access  Private (website_admin with permission)
exports.createWebsiteAdmin = async (req, res, next) => {
  try {
    // Check if the authenticated user is authorized to create website admins
    const userEmail = (req.user.email || '').trim().toLowerCase();
    const isMainAdmin = userEmail === 'omvataliya23@gmail.com';
    
    if (!isMainAdmin) {
      // For non-main admins, check if they have permission
      let currentAdmin;
      try {
        currentAdmin = await prisma.websiteAdmin.findUnique({
          where: { id: req.user.admin_id },
          select: { canCreateAdmins: true }
        });
      } catch (error) {
        // If column doesn't exist, deny permission for non-main admins
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to create website admins. Contact omvataliya23@gmail.com for permission.'
        });
      }

      if (!currentAdmin || !currentAdmin.canCreateAdmins) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to create website admins. Contact omvataliya23@gmail.com for permission.'
        });
      }
    }

    const { fullName, email, phone, password } = req.body;

    // Check if admin with this email already exists
    const existingAdmin = await prisma.websiteAdmin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin (new admins cannot create other admins by default)
    let admin;
    try {
      // Try creating with the new field
      admin = await prisma.websiteAdmin.create({
        data: {
          fullName,
          email,
          phone,
          password: hashedPassword,
          canCreateAdmins: false
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          canCreateAdmins: true,
          createdAt: true
        }
      });
    } catch (error) {
      // Fallback: create without the new field
      admin = await prisma.websiteAdmin.create({
        data: {
          fullName,
          email,
          phone,
          password: hashedPassword
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true
        }
      });
      // Add the default field to the response
      admin.canCreateAdmins = false;
    }

    res.status(201).json({
      success: true,
      data: admin
    });
  } catch (error) {
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

    // Update admin
    let admin;
    try {
      // Try with new field
      admin = await prisma.websiteAdmin.update({
        where: { id: adminId },
        data: {
          fullName: fullName || undefined,
          phone: phone || undefined
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          canCreateAdmins: true,
          createdAt: true,
          updatedAt: true
        }
      });
    } catch (error) {
      // Fallback without new field
      admin = await prisma.websiteAdmin.update({
        where: { id: adminId },
        data: {
          fullName: fullName || undefined,
          phone: phone || undefined
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true
        }
      });
      admin.canCreateAdmins = admin.email === 'omvataliya23@gmail.com';
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
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

// @desc    Update website admin permissions
// @route   PATCH /api/website-admins/:id/permissions
// @access  Private (only omvataliya23@gmail.com)
exports.updateAdminPermissions = async (req, res, next) => {
  try {
    // Check if user is website admin first
    if (req.user.role !== 'website_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only website administrators can update admin permissions'
      });
    }

    // Get the current user's details from database to verify they are the main admin
    const currentAdminResult = await prisma.websiteAdmin.findUnique({
      where: { id: req.user.admin_id || req.user.user_id },
      select: { email: true, id: true }
    });

    if (!currentAdminResult) {
      return res.status(403).json({
        success: false,
        message: 'Current admin not found'
      });
    }

    // Check if current user is the main admin (omvataliya23@gmail.com)
    const isMainAdmin = currentAdminResult.email.toLowerCase().trim() === 'omvataliya23@gmail.com';
    
    if (!isMainAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the main administrator (omvataliya23@gmail.com) can update admin permissions'
      });
    }

    const adminId = parseInt(req.params.id);
    const { canCreateAdmins } = req.body;

    // Validate input
    if (typeof canCreateAdmins !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'canCreateAdmins must be a boolean value'
      });
    }

    // Cannot modify main admin's permissions
    const targetAdmin = await prisma.websiteAdmin.findUnique({
      where: { id: adminId },
      select: { email: true, fullName: true }
    });

    if (!targetAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Website admin not found'
      });
    }

    if (targetAdmin.email === 'omvataliya23@gmail.com') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify main administrator permissions'
      });
    }

    // Use direct database connection for more reliable updates
    const db = require('../config/db');
    
    try {
      logger.info('=== STARTING PERMISSION UPDATE ===');
      logger.info(`Target admin ID: ${adminId}, setting canCreateAdmins to: ${canCreateAdmins}`);
      
      // First, try to add the column if it doesn't exist
      await db.query(`
        ALTER TABLE website_admins 
        ADD COLUMN IF NOT EXISTS can_create_admins BOOLEAN DEFAULT FALSE
      `);
      
      logger.info('✅ Column can_create_admins ensured to exist');
      
      // Set main admin permission (ensure omvataliya23@gmail.com always has permission)
      const mainAdminResult = await db.query(`
        UPDATE website_admins 
        SET can_create_admins = TRUE 
        WHERE email = 'omvataliya23@gmail.com'
        RETURNING admin_id, email, can_create_admins
      `);
      
      logger.info('✅ Main admin permissions set:', mainAdminResult.rows);
      
      // Check current state before update
      const beforeUpdate = await db.query(`
        SELECT admin_id, full_name, email, can_create_admins 
        FROM website_admins 
        WHERE admin_id = $1
      `, [adminId]);
      
      logger.info('📋 Before update:', beforeUpdate.rows[0]);
      
      // Update the specific admin's permissions with explicit transaction
      const updateResult = await db.query(`
        UPDATE website_admins 
        SET can_create_admins = $1, updated_at = CURRENT_TIMESTAMP
        WHERE admin_id = $2
        RETURNING admin_id, full_name, email, phone, can_create_admins, updated_at
      `, [canCreateAdmins, adminId]);

      logger.info('📋 Update query result:', updateResult.rows);

      if (updateResult.rows.length === 0) {
        logger.error('❌ No rows were updated');
        return res.status(404).json({
          success: false,
          message: 'Admin not found or update failed'
        });
      }

      const updatedAdmin = updateResult.rows[0];
      
      // Verify the update by querying again
      const afterUpdate = await db.query(`
        SELECT admin_id, full_name, email, can_create_admins, updated_at 
        FROM website_admins 
        WHERE admin_id = $1
      `, [adminId]);
      
      logger.info('✅ After update verification:', afterUpdate.rows[0]);
      
      // Double check that the value was actually updated
      const actualValue = afterUpdate.rows[0].can_create_admins;
      if (actualValue !== canCreateAdmins) {
        logger.error(`❌ VALUE MISMATCH: Expected ${canCreateAdmins}, got ${actualValue}`);
        return res.status(500).json({
          success: false,
          message: `Database update failed: Expected ${canCreateAdmins}, but value is ${actualValue}`
        });
      }

      logger.info('✅ Permission update completed successfully');

      // Final verification with a small delay to ensure consistency
      setTimeout(async () => {
        try {
          const finalCheck = await db.query(`
            SELECT admin_id, can_create_admins 
            FROM website_admins 
            WHERE admin_id = $1
          `, [adminId]);
          logger.info('🔍 Final verification (after 100ms):', finalCheck.rows[0]);
        } catch (verifyError) {
          logger.error('Final verification error:', verifyError);
        }
      }, 100);

      res.status(200).json({
        success: true,
        message: `Admin permissions ${canCreateAdmins ? 'granted' : 'revoked'} successfully`,
        data: {
          id: updatedAdmin.admin_id,
          fullName: updatedAdmin.full_name,
          email: updatedAdmin.email,
          phone: updatedAdmin.phone,
          canCreateAdmins: updatedAdmin.can_create_admins,
          updatedAt: updatedAdmin.updated_at
        }
      });
    } catch (error) {
      logger.error('❌ Database update error:', error);
      
      // If database update fails, return error
      res.status(500).json({
        success: false,
        message: 'Failed to update admin permissions in database',
        error: error.message
      });
    }
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

    let admin;
    try {
      // Try to get admin with new field
      admin = await prisma.websiteAdmin.findUnique({
        where: { email },
        select: {
          id: true,
          fullName: true,
          email: true,
          password: true,
          phone: true,
          canCreateAdmins: true
        }
      });
    } catch (error) {
      // Fallback for when column doesn't exist yet
      admin = await prisma.websiteAdmin.findUnique({
        where: { email },
        select: {
          id: true,
          fullName: true,
          email: true,
          password: true,
          phone: true
        }
      });
    }

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

    // Check if this is the main admin
    const isMainAdmin = admin.email.trim().toLowerCase() === 'omvataliya23@gmail.com';
    
    res.status(200).json({
      token,
      refreshToken,
      user: {
        id: admin.id,
        name: admin.fullName,
        email: admin.email,
        role: 'website_admin',
        phone: admin.phone,
        canCreateAdmins: isMainAdmin ? true : (admin.canCreateAdmins || false),
        isMainAdmin: isMainAdmin
      }
    });
  } catch (error) {
    next(error);
  }
};
