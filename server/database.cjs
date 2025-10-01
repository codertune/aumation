const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // Still needed for reset token generation

let pool;

// Initialize PostgreSQL database connection pool
async function initDatabase() {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      throw new Error('Missing required database environment variables. Please check your .env file.');
    }

    const dbConfig = {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

    console.log('Connecting to database:', {
      host: dbConfig.host,
      database: dbConfig.database,
      user: dbConfig.user,
      port: dbConfig.port,
      ssl: !!dbConfig.ssl
    });

    pool = new Pool(dbConfig);

    const client = await pool.connect();
    console.log('✅ PostgreSQL database connected successfully');
    client.release();

  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.error('Error details:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Verify your .env file has DB_HOST, DB_USER, DB_NAME, and DB_PASSWORD');
    console.error('2. Check that your database server is running and accessible');
    console.error('3. Verify firewall settings allow database connections');
    console.error('4. For Supabase: Ensure DB_SSL=true and credentials are correct');
    throw error;
  }
}

// Database service functions
const DatabaseService = {
  async authenticateUser(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

      if (result.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Map to frontend compatible format
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        mobile: user.mobile,
        credits: user.is_admin ? 999999 : user.credits, // Admin gets unlimited credits
        isAdmin: user.is_admin,
        emailVerified: user.email_verified,
        memberSince: user.member_since,
        trialEndsAt: user.trial_ends_at,
        status: user.status,
        totalSpent: parseFloat(user.total_spent),
        lastActivity: user.last_activity,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        workHistory: [] // Will be fetched separately if needed
      };

    } catch (error) {
      console.error('? Authentication error:', error.message);
      throw error;
    }
  },

  async createUser(email, password, name, company, mobile) {
    try {
      // Check if user already exists
      const existingResult = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existingResult.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10); // Hash password with bcrypt
      const initialCredits = 100; // Default for new users

      const result = await pool.query(
        `INSERT INTO users (email, name, company, mobile, password_hash, credits, is_admin, email_verified, member_since, trial_ends_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, TRUE, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active')
         RETURNING id, email, name, company, mobile, credits, is_admin, email_verified, member_since, trial_ends_at, status, created_at, updated_at`,
        [email, name, company, mobile, hashedPassword, initialCredits]
      );

      const user = result.rows[0];

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        mobile: user.mobile,
        credits: user.credits,
        isAdmin: user.is_admin,
        emailVerified: user.email_verified,
        memberSince: user.member_since,
        trialEndsAt: user.trial_ends_at,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        workHistory: []
      };

    } catch (error) {
      console.error('? Error creating user:', error);
      throw error;
    }
  },

  async getAllUsers() {
    try {
      const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC");

      return result.rows.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        mobile: user.mobile,
        credits: user.is_admin ? 999999 : user.credits,
        isAdmin: user.is_admin,
        emailVerified: user.email_verified,
        memberSince: user.member_since,
        trialEndsAt: user.trial_ends_at,
        status: user.status,
        totalSpent: parseFloat(user.total_spent),
        lastActivity: user.last_activity,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        workHistory: []
      }));

    } catch (error) {
      console.error('? Error getting all users:', error);
      throw error;
    }
  },

  async getUserById(id) {
    try {
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        mobile: user.mobile,
        credits: user.is_admin ? 999999 : user.credits,
        isAdmin: user.is_admin,
        emailVerified: user.email_verified,
        memberSince: user.member_since,
        trialEndsAt: user.trial_ends_at,
        status: user.status,
        totalSpent: parseFloat(user.total_spent),
        lastActivity: user.last_activity,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        workHistory: []
      };

    } catch (error) {
      console.error('? Error getting user by ID:', error);
      throw error;
    }
  },

  async updateUser(id, updates) {
    try {
      const fields = [];
      const values = [];
      let queryIndex = 1;

      if (updates.credits !== undefined) {
        fields.push(`credits = $${queryIndex++}`);
        values.push(updates.credits);
      }
      if (updates.is_admin !== undefined) {
        fields.push(`is_admin = $${queryIndex++}`);
        values.push(updates.is_admin);
      }
      if (updates.status !== undefined) {
        fields.push(`status = $${queryIndex++}`);
        values.push(updates.status);
      }
      if (updates.name !== undefined) {
        fields.push(`name = $${queryIndex++}`);
        values.push(updates.name);
      }
      if (updates.company !== undefined) {
        fields.push(`company = $${queryIndex++}`);
        values.push(updates.company);
      }
      if (updates.mobile !== undefined) {
        fields.push(`mobile = $${queryIndex++}`);
        values.push(updates.mobile);
      }
      if (updates.totalSpent !== undefined) {
        fields.push(`total_spent = $${queryIndex++}`);
        values.push(updates.totalSpent);
      }
      if (updates.lastActivity !== undefined) {
        fields.push(`last_activity = $${queryIndex++}`);
        values.push(updates.lastActivity);
      }
      // Add other fields as needed

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id); // Add ID for WHERE clause
      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`,
        values
      );

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        mobile: user.mobile,
        credits: user.is_admin ? 999999 : user.credits,
        isAdmin: user.is_admin,
        emailVerified: user.email_verified,
        memberSince: user.member_since,
        trialEndsAt: user.trial_ends_at,
        status: user.status,
        totalSpent: parseFloat(user.total_spent),
        lastActivity: user.last_activity,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        workHistory: []
      };

    } catch (error) {
      console.error('? Error updating user:', error);
      throw error;
    }
  },

  async deleteUser(id) {
    try {
      const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING email", [id]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      console.log(`? User ${result.rows[0].email} deleted successfully`);
      return true;

    } catch (error) {
      console.error('? Error deleting user:', error);
      throw error;
    }
  },

  async updateCredits(userId, credits, operation = 'add') {
    try {
      const userResult = await pool.query("SELECT credits, is_admin FROM users WHERE id = $1", [userId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Admin always has unlimited credits
      if (user.is_admin) {
        return { newCredits: 999999, oldCredits: 999999 };
      }

      let newCredits;
      if (operation === 'add') {
        newCredits = user.credits + credits;
      } else if (operation === 'deduct') {
        newCredits = Math.max(0, user.credits - credits);
      } else {
        throw new Error('Invalid operation. Use "add" or "deduct"');
      }

      const updateResult = await pool.query(
        "UPDATE users SET credits = $1, updated_at = NOW() WHERE id = $2 RETURNING credits",
        [newCredits, userId]
      );

      return { newCredits: updateResult.rows[0].credits, oldCredits: user.credits };

    } catch (error) {
      console.error('? Error updating credits:', error);
      throw error;
    }
  },

  async promoteToAdmin(email) {
    try {
      const result = await pool.query(
        "UPDATE users SET is_admin = TRUE, updated_at = NOW() WHERE email = $1 RETURNING id",
        [email]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      console.log(`? User ${email} promoted to admin`);
      return true;

    } catch (error) {
      console.error('? Error promoting user to admin:', error);
      throw error;
    }
  },

  async createAdminUser(email, password) {
    try {
      const existingResult = await pool.query("SELECT id, is_admin FROM users WHERE email = $1", [email]);

      if (existingResult.rows.length > 0) {
        // User exists, promote to admin if not already
        if (!existingResult.rows[0].is_admin) {
          return this.promoteToAdmin(email);
        }
        return { id: existingResult.rows[0].id, email, isAdmin: true, message: 'User is already an admin.' };
      } else {
        // Create new admin user
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
          `INSERT INTO users (email, name, company, mobile, password_hash, credits, is_admin, email_verified, member_since, trial_ends_at, status)
           VALUES ($1, 'Admin User', 'Smart Process Flow', '', $2, 999999, TRUE, TRUE, CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', 'active')
           RETURNING id, email, is_admin`,
          [email, hashedPassword]
        );
        return { id: result.rows[0].id, email, isAdmin: result.rows[0].is_admin, message: 'Admin user created successfully.' };
      }

    } catch (error) {
      console.error('? Error creating admin user:', error);
      throw error;
    }
  },

  async generatePasswordResetToken(email) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const result = await pool.query(
        "UPDATE users SET reset_password_token = $1, reset_password_expires_at = $2, updated_at = NOW() WHERE email = $3 RETURNING id",
        [token, expiresAt, email]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return { token, email, expiresAt };

    } catch (error) {
      console.error('? Error generating password reset token:', error);
      throw error;
    }
  },

  async resetPassword(token, newPassword) {
    try {
      const result = await pool.query(
        "SELECT id, email FROM users WHERE reset_password_token = $1 AND reset_password_expires_at > NOW()",
        [token]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired reset token');
      }

      const user = result.rows[0];
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.query(
        "UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires_at = NULL, updated_at = NOW() WHERE id = $2",
        [hashedPassword, user.id]
      );

      return { id: user.id, email: user.email, message: 'Password reset successfully' };

    } catch (error) {
      console.error('? Error resetting password:', error);
      throw error;
    }
  },

  async getSystemSettings() {
    try {
      const result = await pool.query("SELECT * FROM system_settings ORDER BY created_at DESC LIMIT 1");

      if (result.rows.length === 0) {
        // Return default settings if none exist and insert them
        const defaultSettings = {
          credits_per_bdt: 2.0,
          free_trial_credits: 100,
          min_purchase_credits: 200,
          enabled_services: JSON.stringify([
            'pdf-excel-converter', 'webcontainer-demo', 'ctg-port-tracking', 'exp-issue', 'exp-correction',
            'exp-duplicate-reporting', 'exp-search', 'damco-booking', 'damco-booking-download',
            'damco-fcr-submission', 'damco-fcr-extractor', 'damco-edoc-upload', 'hm-einvoice-create',
            'hm-einvoice-download', 'hm-einvoice-correction', 'hm-packing-list', 'bepza-ep-issue',
            'bepza-ep-submission', 'bepza-ep-download', 'bepza-ip-issue', 'bepza-ip-submit',
            'bepza-ip-download', 'cash-incentive-application', 'damco-tracking-maersk',
            'myshipment-tracking', 'egm-download', 'custom-tracking'
          ]),
          service_credits_config: JSON.stringify({
            'pdf-excel-converter': 1, 'ctg-port-tracking': 1, 'exp-issue': 2, 'exp-correction': 1.5,
            'exp-duplicate-reporting': 2, 'exp-search': 0.5, 'damco-booking': 3, 'damco-booking-download': 1,
            'damco-fcr-submission': 2, 'damco-fcr-extractor': 1.5, 'damco-edoc-upload': 1,
            'hm-einvoice-create': 2, 'hm-einvoice-download': 1, 'hm-einvoice-correction': 1.5,
            'hm-packing-list': 1, 'bepza-ep-issue': 2.5, 'bepza-ep-submission': 2, 'bepza-ep-download': 1,
            'bepza-ip-issue': 2.5, 'bepza-ip-submit': 2, 'bepza-ip-download': 1,
            'cash-incentive-application': 3, 'damco-tracking-maersk': 1, 'myshipment-tracking': 1,
            'egm-download': 1, 'custom-tracking': 1.5
          }),
          system_notification: JSON.stringify({ enabled: false, message: '', type: 'info', showToAll: true })
        };

        await pool.query(
          `INSERT INTO system_settings (credits_per_bdt, free_trial_credits, min_purchase_credits, enabled_services, service_credits_config, system_notification)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
          [
            defaultSettings.credits_per_bdt, defaultSettings.free_trial_credits,
            defaultSettings.min_purchase_credits, defaultSettings.enabled_services,
            defaultSettings.service_credits_config, defaultSettings.system_notification
          ]
        );
        return {
          creditsPerBDT: defaultSettings.credits_per_bdt,
          freeTrialCredits: defaultSettings.free_trial_credits,
          minPurchaseCredits: defaultSettings.min_purchase_credits,
          enabledServices: JSON.parse(defaultSettings.enabled_services),
          serviceCreditsConfig: JSON.parse(defaultSettings.service_credits_config),
          systemNotification: JSON.parse(defaultSettings.system_notification)
        };
      }

      const settings = result.rows[0];
      return {
        creditsPerBDT: parseFloat(settings.credits_per_bdt),
        freeTrialCredits: settings.free_trial_credits,
        minPurchaseCredits: settings.min_purchase_credits,
        enabledServices: settings.enabled_services, // Already JSONB, so parsed by pg
        serviceCreditsConfig: settings.service_credits_config, // Already JSONB
        systemNotification: settings.system_notification // Already JSONB
      };

    } catch (error) {
      console.error('? Error getting system settings:', error);
      throw error;
    }
  },

  async updateSystemSettings(settings) {
    try {
      // Check if settings exist
      const existingResult = await pool.query("SELECT COUNT(*) FROM system_settings");
      const hasSettings = parseInt(existingResult.rows[0].count) > 0;

      if (hasSettings) {
        // Update existing settings
        await pool.query(
          `UPDATE system_settings SET
            credits_per_bdt = $1,
            free_trial_credits = $2,
            min_purchase_credits = $3,
            enabled_services = $4::jsonb,
            service_credits_config = $5::jsonb,
            system_notification = $6::jsonb,
            updated_at = NOW()
          WHERE id = (SELECT id FROM system_settings ORDER BY created_at DESC LIMIT 1)`,
          [
            settings.creditsPerBDT || 2.0,
            settings.freeTrialCredits || 100,
            settings.minPurchaseCredits || 200,
            JSON.stringify(settings.enabledServices || []),
            JSON.stringify(settings.serviceCreditsConfig || {}),
            JSON.stringify(settings.systemNotification || {})
          ]
        );
      } else {
        // Insert new settings
        await pool.query(
          `INSERT INTO system_settings (
            credits_per_bdt, free_trial_credits,
            min_purchase_credits, enabled_services, service_credits_config, system_notification
          ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
          [
            settings.creditsPerBDT || 2.0,
            settings.freeTrialCredits || 100,
            settings.minPurchaseCredits || 200,
            JSON.stringify(settings.enabledServices || []),
            JSON.stringify(settings.serviceCreditsConfig || {}),
            JSON.stringify(settings.systemNotification || {})
          ]
        );
      }

      console.log('? System settings updated successfully');
      return this.getSystemSettings(); // Return updated settings

    } catch (error) {
      console.error('? Error updating system settings:', error);
      throw error;
    }
  },

  async addWorkHistory(userId, workItem) {
    try {
      const result = await pool.query(
        `INSERT INTO work_history (user_id, service_id, service_name, file_name, credits_used, status, result_files, download_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) RETURNING *`,
        [
          userId,
          workItem.serviceId,
          workItem.serviceName,
          workItem.fileName,
          workItem.creditsUsed,
          workItem.status || 'completed',
          workItem.resultFiles || '[]',
          workItem.downloadUrl || null
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error adding work history:', error);
      throw error;
    }
  },

  async getWorkHistory(userId) {
    try {
      const result = await pool.query("SELECT * FROM work_history WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
      return result.rows.map(item => ({
        id: item.id,
        userId: item.user_id,
        serviceId: item.service_id,
        serviceName: item.service_name,
        fileName: item.file_name,
        creditsUsed: item.credits_used,
        status: item.status,
        resultFiles: item.result_files, // Already JSONB
        downloadUrl: item.download_url,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('? Error getting work history:', error);
      throw error;
    }
  },

  async updateWorkHistoryFiles(workId, resultFiles) {
    try {
      const result = await pool.query(
        `UPDATE work_history SET result_files = $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(resultFiles), workId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error updating work history files:', error);
      throw error;
    }
  },

  // Blog Posts - Placeholder implementations
  async getBlogPosts() {
    try {
      const result = await pool.query("SELECT * FROM blog_posts ORDER BY published_at DESC");
      return result.rows.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        author: post.author,
        tags: post.tags,
        featured: post.featured,
        status: post.status,
        views: post.views,
        metaTitle: post.meta_title,
        metaDescription: post.meta_description,
        metaKeywords: post.meta_keywords,
        publishedAt: post.published_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }));
    } catch (error) {
      console.error('? Error getting blog posts:', error);
      throw error;
    }
  },

  async addBlogPost(postData) {
    try {
      const result = await pool.query(
        `INSERT INTO blog_posts (title, slug, content, excerpt, author, tags, featured, status, views, meta_title, meta_description, meta_keywords, published_at)
         VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          postData.title, postData.slug, postData.content, postData.excerpt, postData.author,
          postData.tags, postData.featured, postData.status, postData.views, postData.metaTitle,
          postData.metaDescription, postData.metaKeywords, postData.publishedAt || new Date()
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error adding blog post:', error);
      throw error;
    }
  },

  async updateBlogPost(id, updates) {
    try {
      const fields = [];
      const values = [];
      let queryIndex = 1;

      if (updates.title !== undefined) { fields.push(`title = $${queryIndex++}`); values.push(updates.title); }
      if (updates.slug !== undefined) { fields.push(`slug = $${queryIndex++}`); values.push(updates.slug); }
      if (updates.content !== undefined) { fields.push(`content = $${queryIndex++}`); values.push(updates.content); }
      if (updates.excerpt !== undefined) { fields.push(`excerpt = $${queryIndex++}`); values.push(updates.excerpt); }
      if (updates.author !== undefined) { fields.push(`author = $${queryIndex++}`); values.push(updates.author); }
      if (updates.tags !== undefined) { fields.push(`tags = $${queryIndex++}::text[]`); values.push(updates.tags); }
      if (updates.featured !== undefined) { fields.push(`featured = $${queryIndex++}`); values.push(updates.featured); }
      if (updates.status !== undefined) { fields.push(`status = $${queryIndex++}`); values.push(updates.status); }
      if (updates.views !== undefined) { fields.push(`views = $${queryIndex++}`); values.push(updates.views); }
      if (updates.metaTitle !== undefined) { fields.push(`meta_title = $${queryIndex++}`); values.push(updates.metaTitle); }
      if (updates.metaDescription !== undefined) { fields.push(`meta_description = $${queryIndex++}`); values.push(updates.metaDescription); }
      if (updates.metaKeywords !== undefined) { fields.push(`meta_keywords = $${queryIndex++}`); values.push(updates.metaKeywords); }
      if (updates.publishedAt !== undefined) { fields.push(`published_at = $${queryIndex++}`); values.push(updates.publishedAt); }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id);
      const result = await pool.query(
        `UPDATE blog_posts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error updating blog post:', error);
      throw error;
    }
  },

  async deleteBlogPost(id) {
    try {
      const result = await pool.query("DELETE FROM blog_posts WHERE id = $1 RETURNING id", [id]);
      if (result.rows.length === 0) {
        throw new Error('Blog post not found');
      }
      return true;
    } catch (error) {
      console.error('? Error deleting blog post:', error);
      throw error;
    }
  },

  async getServiceTemplates() {
    try {
      const result = await pool.query(
        "SELECT * FROM service_templates WHERE is_active = true ORDER BY category, service_name"
      );
      return result.rows;
    } catch (error) {
      console.error('? Error getting service templates:', error);
      throw error;
    }
  },

  async getServiceTemplate(serviceId) {
    try {
      const result = await pool.query(
        "SELECT * FROM service_templates WHERE service_id = $1",
        [serviceId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error getting service template:', error);
      throw error;
    }
  },

  async createBulkUpload(userId, serviceId, serviceName, originalFileName, totalRows) {
    try {
      const result = await pool.query(
        `INSERT INTO bulk_uploads (user_id, service_id, service_name, original_file_name, total_rows, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW()) RETURNING *`,
        [userId, serviceId, serviceName, originalFileName, totalRows]
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error creating bulk upload:', error);
      throw error;
    }
  },

  async updateBulkUpload(bulkUploadId, updates) {
    try {
      const fields = [];
      const values = [];
      let queryIndex = 1;

      if (updates.processedRows !== undefined) { fields.push(`processed_rows = $${queryIndex++}`); values.push(updates.processedRows); }
      if (updates.successfulRows !== undefined) { fields.push(`successful_rows = $${queryIndex++}`); values.push(updates.successfulRows); }
      if (updates.failedRows !== undefined) { fields.push(`failed_rows = $${queryIndex++}`); values.push(updates.failedRows); }
      if (updates.status !== undefined) { fields.push(`status = $${queryIndex++}`); values.push(updates.status); }
      if (updates.creditsUsed !== undefined) { fields.push(`credits_used = $${queryIndex++}`); values.push(updates.creditsUsed); }
      if (updates.errorMessage !== undefined) { fields.push(`error_message = $${queryIndex++}`); values.push(updates.errorMessage); }
      if (updates.resultZipPath !== undefined) { fields.push(`result_zip_path = $${queryIndex++}`); values.push(updates.resultZipPath); }
      if (updates.expiresAt !== undefined) { fields.push(`expires_at = $${queryIndex++}`); values.push(updates.expiresAt); }
      if (updates.completedAt !== undefined) { fields.push(`completed_at = $${queryIndex++}`); values.push(updates.completedAt); }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(bulkUploadId);
      const result = await pool.query(
        `UPDATE bulk_uploads SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error updating bulk upload:', error);
      throw error;
    }
  },

  async getBulkUploads(userId) {
    try {
      const result = await pool.query(
        "SELECT * FROM bulk_uploads WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('? Error getting bulk uploads:', error);
      throw error;
    }
  },

  async getBulkUpload(bulkUploadId) {
    try {
      const result = await pool.query(
        "SELECT * FROM bulk_uploads WHERE id = $1",
        [bulkUploadId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error getting bulk upload:', error);
      throw error;
    }
  },

  async createBulkUploadItem(bulkUploadId, rowNumber, rowData) {
    try {
      const result = await pool.query(
        `INSERT INTO bulk_upload_items (bulk_upload_id, row_number, row_data, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW()) RETURNING *`,
        [bulkUploadId, rowNumber, JSON.stringify(rowData)]
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error creating bulk upload item:', error);
      throw error;
    }
  },

  async updateBulkUploadItem(itemId, updates) {
    try {
      const fields = [];
      const values = [];
      let queryIndex = 1;

      if (updates.workHistoryId !== undefined) { fields.push(`work_history_id = $${queryIndex++}`); values.push(updates.workHistoryId); }
      if (updates.status !== undefined) { fields.push(`status = $${queryIndex++}`); values.push(updates.status); }
      if (updates.creditsUsed !== undefined) { fields.push(`credits_used = $${queryIndex++}`); values.push(updates.creditsUsed); }
      if (updates.errorMessage !== undefined) { fields.push(`error_message = $${queryIndex++}`); values.push(updates.errorMessage); }
      if (updates.resultFilePath !== undefined) { fields.push(`result_file_path = $${queryIndex++}`); values.push(updates.resultFilePath); }
      if (updates.processedAt !== undefined) { fields.push(`processed_at = $${queryIndex++}`); values.push(updates.processedAt); }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(itemId);
      const result = await pool.query(
        `UPDATE bulk_upload_items SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error updating bulk upload item:', error);
      throw error;
    }
  },

  async getBulkUploadItems(bulkUploadId) {
    try {
      const result = await pool.query(
        "SELECT * FROM bulk_upload_items WHERE bulk_upload_id = $1 ORDER BY row_number",
        [bulkUploadId]
      );
      return result.rows;
    } catch (error) {
      console.error('? Error getting bulk upload items:', error);
      throw error;
    }
  },

  async getExpiredWorkHistory() {
    try {
      const result = await pool.query(
        "SELECT * FROM work_history WHERE expires_at < NOW() AND result_files IS NOT NULL"
      );
      return result.rows;
    } catch (error) {
      console.error('? Error getting expired work history:', error);
      throw error;
    }
  },

  async getExpiredBulkUploads() {
    try {
      const result = await pool.query(
        "SELECT * FROM bulk_uploads WHERE expires_at < NOW() AND result_zip_path IS NOT NULL"
      );
      return result.rows;
    } catch (error) {
      console.error('? Error getting expired bulk uploads:', error);
      throw error;
    }
  },

  async logCleanup(cleanupData) {
    try {
      const result = await pool.query(
        `INSERT INTO cleanup_logs (cleanup_date, files_deleted, space_freed_mb, work_history_ids, bulk_upload_ids, status, error_message, created_at)
         VALUES (NOW(), $1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [
          cleanupData.filesDeleted,
          cleanupData.spaceFreedMb,
          cleanupData.workHistoryIds,
          cleanupData.bulkUploadIds,
          cleanupData.status,
          cleanupData.errorMessage || null
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('? Error logging cleanup:', error);
      throw error;
    }
  },

  async getCleanupLogs(limit = 50) {
    try {
      const result = await pool.query(
        "SELECT * FROM cleanup_logs ORDER BY cleanup_date DESC LIMIT $1",
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('? Error getting cleanup logs:', error);
      throw error;
    }
  }
};

module.exports = {
  initDatabase,
  DatabaseService
};
