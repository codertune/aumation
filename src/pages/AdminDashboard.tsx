import React, { useState, useRef } from 'react';
import { Users, Settings, BarChart3, FileText, Plus, CreditCard as Edit, Trash2, Save, X, Upload, Image, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface BlogFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  tags: string[];
  featured: boolean;
  status: 'published' | 'draft';
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  featuredImage: string;
  imageAlt: string;
}

export default function AdminDashboard() {
  const { 
    users, 
    creditSettings, 
    updateCreditSettings, 
    getServiceCreditCost,
    updateServiceCreditCost,
    updateSystemNotification, 
    updateUserAdmin, 
    suspendUser, 
    activateUser,
    deleteUser,
    toggleService,
    isServiceEnabled,
    blogPosts,
    addBlogPost,
    updateBlogPost,
    deleteBlogPost,
    exportUserData,
    importUserData
  } = useAuth();

  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingBlog, setEditingBlog] = useState<string | null>(null);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [notification, setNotification] = useState(creditSettings.systemNotification || {
    enabled: false,
    message: '',
    type: 'info' as const,
    showToAll: true
  });
  const [blogFormData, setBlogFormData] = useState<BlogFormData>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    author: 'Admin',
    tags: [],
    featured: false,
    status: 'draft',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    featuredImage: '',
    imageAlt: ''
  });
  const [newTag, setNewTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allServices = [
    { id: 'pdf-excel-converter', name: 'PDF to Excel/CSV Converter', category: 'PDF Extractor' },
    { id: 'ctg-port-tracking', name: 'CTG Port Authority Tracking', category: 'Tracking Services' },
    { id: 'exp-issue', name: 'Issue EXP', category: 'Bangladesh Bank' },
    { id: 'exp-correction', name: 'Issued EXP Correction', category: 'Bangladesh Bank' },
    { id: 'exp-duplicate-reporting', name: 'Duplicate EXP', category: 'Bangladesh Bank' },
    { id: 'exp-search', name: 'Search EXP Detail Information', category: 'Bangladesh Bank' },
    { id: 'damco-booking', name: 'Damco (APM) - Booking', category: 'Forwarder Handler - Damco' },
    { id: 'damco-booking-download', name: 'Damco (APM) - Booking Download', category: 'Forwarder Handler - Damco' },
    { id: 'damco-fcr-submission', name: 'Damco (APM) - FCR Submission', category: 'Forwarder Handler - Damco' },
    { id: 'damco-fcr-extractor', name: 'Damco (APM) - FCR Extractor from Mail', category: 'Forwarder Handler - Damco' },
    { id: 'damco-edoc-upload', name: 'Damco (APM) - E-Doc Upload', category: 'Forwarder Handler - Damco' },
    { id: 'hm-einvoice-create', name: 'H&M - E-Invoice Create', category: 'Buyer Handler - H&M' },
    { id: 'hm-einvoice-download', name: 'H&M - E-Invoice Download', category: 'Buyer Handler - H&M' },
    { id: 'hm-einvoice-correction', name: 'H&M - E-Invoice Correction', category: 'Buyer Handler - H&M' },
    { id: 'hm-packing-list', name: 'H&M - Download E-Packing List', category: 'Buyer Handler - H&M' },
    { id: 'bepza-ep-issue', name: 'BEPZA - EP Issue', category: 'BEPZA' },
    { id: 'bepza-ep-submission', name: 'BEPZA - EP Submission', category: 'BEPZA' },
    { id: 'bepza-ep-download', name: 'BEPZA - EP Download', category: 'BEPZA' },
    { id: 'bepza-ip-issue', name: 'BEPZA - IP Issue', category: 'BEPZA' },
    { id: 'bepza-ip-submit', name: 'BEPZA - IP Submit', category: 'BEPZA' },
    { id: 'bepza-ip-download', name: 'BEPZA - IP Download', category: 'BEPZA' },
    { id: 'cash-incentive-application', name: 'Cash Incentive Application', category: 'Cash Incentive Applications' },
    { id: 'damco-tracking-maersk', name: 'Damco (APM) Tracking', category: 'Tracking Services' },
    { id: 'myshipment-tracking', name: 'MyShipment Tracking (MGH)', category: 'Tracking Services' },
    { id: 'egm-download', name: 'EGM Download', category: 'Tracking Services' },
    { id: 'custom-tracking', name: 'Custom Tracking', category: 'Tracking Services' }
  ];

  const handleUserUpdate = (userId: string, field: string, value: any) => {
    updateUserAdmin(userId, { [field]: value });
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (window.confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      try {
        await deleteUser(userId);
        alert('User deleted successfully');
      } catch (error) {
        alert('Failed to delete user: ' + error.message);
      }
    }
  };

  const handleNotificationUpdate = () => {
    updateSystemNotification(notification);
    alert('System notification updated successfully');
  };

  const handleBlogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBlog) {
      updateBlogPost(editingBlog, blogFormData);
      setEditingBlog(null);
    } else {
      addBlogPost(blogFormData);
    }
    
    setBlogFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      author: 'Admin',
      tags: [],
      featured: false,
      status: 'draft',
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      featuredImage: '',
      imageAlt: ''
    });
    setShowBlogForm(false);
  };

  const handleEditBlog = (blogId: string) => {
    const blog = blogPosts.find(b => b.id === blogId);
    if (blog) {
      setBlogFormData({
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt,
        author: blog.author,
        tags: blog.tags,
        featured: blog.featured,
        status: blog.status,
        metaTitle: blog.metaTitle || '',
        metaDescription: blog.metaDescription || '',
        metaKeywords: blog.metaKeywords || '',
        featuredImage: blog.featuredImage || '',
        imageAlt: blog.imageAlt || ''
      });
      setEditingBlog(blogId);
      setShowBlogForm(true);
    }
  };

  const handleDeleteBlog = (blogId: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      deleteBlogPost(blogId);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !blogFormData.tags.includes(newTag.trim())) {
      setBlogFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setBlogFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For demo purposes, we'll use a placeholder URL
      // In production, you'd upload to a CDN or file storage service
      const imageUrl = `https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop`;
      setBlogFormData(prev => ({
        ...prev,
        featuredImage: imageUrl,
        imageAlt: file.name.split('.')[0].replace(/[-_]/g, ' ')
      }));
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setBlogFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
      metaTitle: title
    }));
  };

  const handleExportData = () => {
    const data = exportUserData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-process-flow-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result as string;
          if (importUserData(data)) {
            alert('Data imported successfully');
          } else {
            alert('Failed to import data. Please check the file format.');
          }
        } catch (error) {
          alert('Error importing data: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, services, and system settings</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'users', name: 'Users', icon: Users },
              { id: 'services', name: 'Services', icon: Settings },
              { id: 'blog', name: 'Blog Posts', icon: FileText },
              { id: 'system', name: 'System', icon: BarChart3 }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">User Management</h2>
              <div className="flex space-x-4">
                <button
                  onClick={handleExportData}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Export Data
                </button>
                <label className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer">
                  Import Data
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <select
                            defaultValue={user.isAdmin ? 'admin' : 'user'}
                            onChange={(e) => handleUserUpdate(user.id, 'isAdmin', e.target.value === 'admin')}
                            className="border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.isAdmin ? 'Admin' : 'User'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id && !user.isAdmin ? (
                          <input
                            type="number"
                            defaultValue={user.credits}
                            onChange={(e) => handleUserUpdate(user.id, 'credits', parseInt(e.target.value))}
                            className="border border-gray-300 rounded px-2 py-1 w-20"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">
                            {user.isAdmin ? '8' : user.credits}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {editingUser === user.id ? (
                          <button
                            onClick={() => setEditingUser(null)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingUser(user.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        
                        {user.status === 'active' ? (
                          <button
                            onClick={() => suspendUser(user.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            <EyeOff className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => activateUser(user.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Service Management</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {allServices.filter(s => isServiceEnabled(s.id)).length} of {allServices.length} services enabled
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    allServices.forEach(service => {
                      if (!isServiceEnabled(service.id)) {
                        toggleService(service.id);
                      }
                    });
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  Enable All
                </button>
                <button
                  onClick={() => {
                    allServices.forEach(service => {
                      if (isServiceEnabled(service.id)) {
                        toggleService(service.id);
                      }
                    });
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  Disable All
                </button>
              </div>
            </div>

            {/* Group services by category */}
            {Array.from(new Set(allServices.map(s => s.category))).map(category => {
              const categoryServices = allServices.filter(s => s.category === category);
              const enabledInCategory = categoryServices.filter(s => isServiceEnabled(s.id)).length;

              return (
                <div key={category} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-gray-900">{category}</h3>
                      <span className="text-sm text-gray-500">({enabledInCategory}/{categoryServices.length} enabled)</span>
                    </div>
                    <button
                      onClick={() => {
                        const shouldEnable = enabledInCategory < categoryServices.length;
                        categoryServices.forEach(service => {
                          if (shouldEnable && !isServiceEnabled(service.id)) {
                            toggleService(service.id);
                          } else if (!shouldEnable && isServiceEnabled(service.id)) {
                            toggleService(service.id);
                          }
                        });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {enabledInCategory === categoryServices.length ? 'Disable Category' : 'Enable Category'}
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {categoryServices.map(service => (
                      <div
                        key={service.id}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all ${
                          isServiceEnabled(service.id)
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-gray-900">{service.name}</h4>
                            {isServiceEnabled(service.id) ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                ENABLED
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full">
                                DISABLED
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-gray-500">{service.category}</p>
                            <span className="text-xs text-blue-600 font-medium">
                              {getServiceCreditCost(service.id)} credits
                            </span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isServiceEnabled(service.id)}
                            onChange={() => toggleService(service.id)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Blog Posts Tab */}
        {activeTab === 'blog' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Blog Management</h2>
              <button
                onClick={() => setShowBlogForm(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </button>
            </div>

            {showBlogForm && (
              <div className="mb-8 p-6 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">
                  {editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
                </h3>
                
                <form onSubmit={handleBlogSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={blogFormData.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                      <input
                        type="text"
                        value={blogFormData.slug}
                        onChange={(e) => setBlogFormData(prev => ({ ...prev, slug: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                    <textarea
                      value={blogFormData.excerpt}
                      onChange={(e) => setBlogFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                      value={blogFormData.content}
                      onChange={(e) => setBlogFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="You can use HTML tags for formatting..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image</label>
                    <div className="flex items-center space-x-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </button>
                      <input
                        type="url"
                        value={blogFormData.featuredImage}
                        onChange={(e) => setBlogFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
                        placeholder="Or paste image URL"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {blogFormData.featuredImage && (
                      <div className="mt-2">
                        <img
                          src={blogFormData.featuredImage}
                          alt="Preview"
                          className="w-32 h-20 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image Alt Text</label>
                    <input
                      type="text"
                      value={blogFormData.imageAlt}
                      onChange={(e) => setBlogFormData(prev => ({ ...prev, imageAlt: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe the image for accessibility"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Add a tag"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {blogFormData.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                      <input
                        type="text"
                        value={blogFormData.author}
                        onChange={(e) => setBlogFormData(prev => ({ ...prev, author: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={blogFormData.status}
                        onChange={(e) => setBlogFormData(prev => ({ ...prev, status: e.target.value as 'published' | 'draft' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={blogFormData.featured}
                          onChange={(e) => setBlogFormData(prev => ({ ...prev, featured: e.target.checked }))}
                          className="mr-2"
                        />
                        Featured Post
                      </label>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                      <input
                        type="text"
                        value={blogFormData.metaTitle}
                        onChange={(e) => setBlogFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
                      <input
                        type="text"
                        value={blogFormData.metaKeywords}
                        onChange={(e) => setBlogFormData(prev => ({ ...prev, metaKeywords: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="keyword1, keyword2, keyword3"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                    <textarea
                      value={blogFormData.metaDescription}
                      onChange={(e) => setBlogFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description for search engines"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      {editingBlog ? 'Update Post' : 'Create Post'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBlogForm(false);
                        setEditingBlog(null);
                        setBlogFormData({
                          title: '',
                          slug: '',
                          content: '',
                          excerpt: '',
                          author: 'Admin',
                          tags: [],
                          featured: false,
                          status: 'draft',
                          metaTitle: '',
                          metaDescription: '',
                          metaKeywords: '',
                          featuredImage: '',
                          imageAlt: ''
                        });
                      }}
                      className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {blogPosts.map(post => (
                <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{post.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{post.excerpt}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>By {post.author}</span>
                        <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded-full ${
                          post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {post.status}
                        </span>
                        {post.featured && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Featured</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditBlog(post.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBlog(post.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* System Notification */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">System Notification</h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notificationEnabled"
                    checked={notification.enabled}
                    onChange={(e) => setNotification(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="mr-3"
                  />
                  <label htmlFor="notificationEnabled" className="text-sm font-medium text-gray-700">
                    Enable System Notification
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={notification.message}
                    onChange={(e) => setNotification(prev => ({ ...prev, message: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter notification message..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={notification.type}
                      onChange={(e) => setNotification(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                      <option value="success">Success</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showToAll"
                      checked={notification.showToAll}
                      onChange={(e) => setNotification(prev => ({ ...prev, showToAll: e.target.checked }))}
                      className="mr-3"
                    />
                    <label htmlFor="showToAll" className="text-sm font-medium text-gray-700">
                      Show to all users
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleNotificationUpdate}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Update Notification
                </button>
              </div>
            </div>

            {/* Credit Settings */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Credit Settings</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Credits per BDT</label>
                  <input
                    type="number"
                    step="0.1"
                    value={creditSettings.creditsPerBDT}
                    onChange={(e) => updateCreditSettings({ creditsPerBDT: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Free Trial Credits</label>
                  <input
                    type="number"
                    value={creditSettings.freeTrialCredits}
                    onChange={(e) => updateCreditSettings({ freeTrialCredits: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Purchase Credits</label>
                  <input
                    type="number"
                    value={creditSettings.minPurchaseCredits}
                    onChange={(e) => updateCreditSettings({ minPurchaseCredits: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Individual Service Credits */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Service Credits</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {allServices.map(service => (
                    <div key={service.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{service.name}</h4>
                        <p className="text-xs text-gray-500">{service.category}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={getServiceCreditCost(service.id)}
                          onChange={(e) => updateServiceCreditCost(service.id, parseFloat(e.target.value) || 0)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-xs text-gray-500">credits</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        Price: ?{(getServiceCreditCost(service.id) / creditSettings.creditsPerBDT).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Changes are saved automatically. The price is calculated based on the Credits per BDT rate above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}