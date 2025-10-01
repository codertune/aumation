const supabase = require('./supabase-client.cjs');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  try {
    console.log('Initializing Supabase client...');

    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    console.log('✅ Supabase client initialized successfully');
    console.log(`   URL: ${process.env.VITE_SUPABASE_URL}`);
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

const DatabaseService = {
  async authenticateUser(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!users) {
        throw new Error('Invalid email or password');
      }

      const user = users;
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

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
      console.error('❌ Authentication error:', error.message);
      throw error;
    }
  },

  async createUser(email, password, name, company, mobile) {
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        throw new Error('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const initialCredits = 100;

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email,
          name,
          company,
          mobile,
          password_hash: hashedPassword,
          credits: initialCredits,
          is_admin: false,
          email_verified: true,
          member_since: new Date().toISOString().split('T')[0],
          trial_ends_at: trialEndsAt.toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        company: newUser.company,
        mobile: newUser.mobile,
        credits: newUser.credits,
        isAdmin: newUser.is_admin,
        emailVerified: newUser.email_verified,
        memberSince: newUser.member_since,
        trialEndsAt: newUser.trial_ends_at,
        status: newUser.status,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
        workHistory: []
      };

    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  },

  async getAllUsers() {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return users.map(user => ({
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
      console.error('❌ Error getting all users:', error);
      throw error;
    }
  },

  async getUserById(id) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!user) {
        return null;
      }

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
      console.error('❌ Error getting user by ID:', error);
      throw error;
    }
  },

  async updateUser(id, updates) {
    try {
      const dbUpdates = {};

      if (updates.credits !== undefined) dbUpdates.credits = updates.credits;
      if (updates.is_admin !== undefined) dbUpdates.is_admin = updates.is_admin;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.company !== undefined) dbUpdates.company = updates.company;
      if (updates.mobile !== undefined) dbUpdates.mobile = updates.mobile;
      if (updates.totalSpent !== undefined) dbUpdates.total_spent = updates.totalSpent;
      if (updates.lastActivity !== undefined) dbUpdates.last_activity = updates.lastActivity;

      if (Object.keys(dbUpdates).length === 0) {
        throw new Error('No fields to update');
      }

      dbUpdates.updated_at = new Date().toISOString();

      const { data: user, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

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
      console.error('❌ Error updating user:', error);
      throw error;
    }
  },

  async deleteUser(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .select('email')
        .single();

      if (error) {
        throw error;
      }

      console.log(`✅ User ${data.email} deleted successfully`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  },

  async updateCredits(userId, credits, operation = 'add') {
    try {
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('credits, is_admin')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!user) {
        throw new Error('User not found');
      }

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

      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: newCredits, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      return { newCredits, oldCredits: user.credits };

    } catch (error) {
      console.error('❌ Error updating credits:', error);
      throw error;
    }
  },

  async generatePasswordResetToken(email) {
    try {
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      const { error } = await supabase
        .from('users')
        .update({
          reset_password_token: token,
          reset_password_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (error) {
        throw error;
      }

      return { token, email, expiresAt };

    } catch (error) {
      console.error('❌ Error generating password reset token:', error);
      throw error;
    }
  },

  async resetPassword(token, newPassword) {
    try {
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, email')
        .eq('reset_password_token', token)
        .gt('reset_password_expires_at', new Date().toISOString())
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          reset_password_token: null,
          reset_password_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      return { id: user.id, email: user.email, message: 'Password reset successfully' };

    } catch (error) {
      console.error('❌ Error resetting password:', error);
      throw error;
    }
  },

  async getSystemSettings() {
    try {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!settings) {
        const defaultSettings = {
          credits_per_bdt: 2.0,
          free_trial_credits: 100,
          min_purchase_credits: 200,
          enabled_services: [
            'pdf-excel-converter', 'ctg-port-tracking', 'exp-issue', 'exp-correction',
            'exp-duplicate-reporting', 'exp-search', 'damco-booking', 'damco-booking-download',
            'damco-fcr-submission', 'damco-fcr-extractor', 'damco-edoc-upload', 'hm-einvoice-create',
            'hm-einvoice-download', 'hm-einvoice-correction', 'hm-packing-list', 'bepza-ep-issue',
            'bepza-ep-submission', 'bepza-ep-download', 'bepza-ip-issue', 'bepza-ip-submit',
            'bepza-ip-download', 'cash-incentive-application', 'damco-tracking-maersk',
            'myshipment-tracking', 'egm-download', 'custom-tracking'
          ],
          service_credits_config: {
            'pdf-excel-converter': 1, 'ctg-port-tracking': 1, 'exp-issue': 2, 'exp-correction': 1.5,
            'exp-duplicate-reporting': 2, 'exp-search': 0.5, 'damco-booking': 3, 'damco-booking-download': 1,
            'damco-fcr-submission': 2, 'damco-fcr-extractor': 1.5, 'damco-edoc-upload': 1,
            'hm-einvoice-create': 2, 'hm-einvoice-download': 1, 'hm-einvoice-correction': 1.5,
            'hm-packing-list': 1, 'bepza-ep-issue': 2.5, 'bepza-ep-submission': 2, 'bepza-ep-download': 1,
            'bepza-ip-issue': 2.5, 'bepza-ip-submit': 2, 'bepza-ip-download': 1,
            'cash-incentive-application': 3, 'damco-tracking-maersk': 1, 'myshipment-tracking': 1,
            'egm-download': 1, 'custom-tracking': 1.5
          },
          system_notification: { enabled: false, message: '', type: 'info', showToAll: true }
        };

        const { error: insertError } = await supabase
          .from('system_settings')
          .insert(defaultSettings);

        if (insertError) {
          throw insertError;
        }

        return {
          creditsPerBDT: defaultSettings.credits_per_bdt,
          freeTrialCredits: defaultSettings.free_trial_credits,
          minPurchaseCredits: defaultSettings.min_purchase_credits,
          enabledServices: defaultSettings.enabled_services,
          serviceCreditsConfig: defaultSettings.service_credits_config,
          systemNotification: defaultSettings.system_notification
        };
      }

      return {
        creditsPerBDT: parseFloat(settings.credits_per_bdt),
        freeTrialCredits: settings.free_trial_credits,
        minPurchaseCredits: settings.min_purchase_credits,
        enabledServices: settings.enabled_services,
        serviceCreditsConfig: settings.service_credits_config,
        systemNotification: settings.system_notification
      };

    } catch (error) {
      console.error('❌ Error getting system settings:', error);
      throw error;
    }
  },

  async updateSystemSettings(settings) {
    try {
      const { count } = await supabase
        .from('system_settings')
        .select('*', { count: 'exact', head: true });

      const dbSettings = {
        credits_per_bdt: settings.creditsPerBDT || 2.0,
        free_trial_credits: settings.freeTrialCredits || 100,
        min_purchase_credits: settings.minPurchaseCredits || 200,
        enabled_services: settings.enabledServices || [],
        service_credits_config: settings.serviceCreditsConfig || {},
        system_notification: settings.systemNotification || {},
        updated_at: new Date().toISOString()
      };

      if (count > 0) {
        const { data: latestSettings } = await supabase
          .from('system_settings')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { error } = await supabase
          .from('system_settings')
          .update(dbSettings)
          .eq('id', latestSettings.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert(dbSettings);

        if (error) {
          throw error;
        }
      }

      console.log('✅ System settings updated successfully');
      return this.getSystemSettings();

    } catch (error) {
      console.error('❌ Error updating system settings:', error);
      throw error;
    }
  },

  async addWorkHistory(userId, workItem) {
    try {
      const { data, error } = await supabase
        .from('work_history')
        .insert({
          user_id: userId,
          service_id: workItem.serviceId,
          service_name: workItem.serviceName,
          file_name: workItem.fileName,
          credits_used: workItem.creditsUsed,
          status: workItem.status || 'completed',
          result_files: workItem.resultFiles || [],
          download_url: workItem.downloadUrl || null
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error adding work history:', error);
      throw error;
    }
  },

  async getWorkHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('work_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(item => ({
        id: item.id,
        userId: item.user_id,
        serviceId: item.service_id,
        serviceName: item.service_name,
        fileName: item.file_name,
        creditsUsed: item.credits_used,
        status: item.status,
        resultFiles: item.result_files,
        downloadUrl: item.download_url,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('❌ Error getting work history:', error);
      throw error;
    }
  },

  async updateWorkHistoryFiles(workId, resultFiles) {
    try {
      const { data, error } = await supabase
        .from('work_history')
        .update({ result_files: resultFiles })
        .eq('id', workId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating work history files:', error);
      throw error;
    }
  },

  async getBlogPosts() {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(post => ({
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
        updatedAt: post.updated_at
      }));
    } catch (error) {
      console.error('❌ Error getting blog posts:', error);
      throw error;
    }
  },

  async addBlogPost(postData) {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert({
          title: postData.title,
          slug: postData.slug,
          content: postData.content,
          excerpt: postData.excerpt,
          author: postData.author,
          tags: postData.tags,
          featured: postData.featured,
          status: postData.status,
          views: postData.views || 0,
          meta_title: postData.metaTitle,
          meta_description: postData.metaDescription,
          meta_keywords: postData.metaKeywords,
          published_at: postData.publishedAt || new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error adding blog post:', error);
      throw error;
    }
  },

  async updateBlogPost(id, updates) {
    try {
      const dbUpdates = {};

      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.excerpt !== undefined) dbUpdates.excerpt = updates.excerpt;
      if (updates.author !== undefined) dbUpdates.author = updates.author;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.featured !== undefined) dbUpdates.featured = updates.featured;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.views !== undefined) dbUpdates.views = updates.views;
      if (updates.metaTitle !== undefined) dbUpdates.meta_title = updates.metaTitle;
      if (updates.metaDescription !== undefined) dbUpdates.meta_description = updates.metaDescription;
      if (updates.metaKeywords !== undefined) dbUpdates.meta_keywords = updates.metaKeywords;
      if (updates.publishedAt !== undefined) dbUpdates.published_at = updates.publishedAt;

      if (Object.keys(dbUpdates).length === 0) {
        throw new Error('No fields to update');
      }

      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('blog_posts')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating blog post:', error);
      throw error;
    }
  },

  async deleteBlogPost(id) {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting blog post:', error);
      throw error;
    }
  }
};

module.exports = {
  initDatabase,
  DatabaseService
};
