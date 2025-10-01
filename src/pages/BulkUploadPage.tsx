import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Clock, Trash2 } from 'lucide-react';

interface ServiceTemplate {
  service_id: string;
  service_name: string;
  category: string;
  template_csv_path: string;
  credit_cost: number;
}

interface BulkUpload {
  id: string;
  service_name: string;
  original_file_name: string;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: string;
  credits_used: number;
  result_zip_path: string | null;
  expires_at: string | null;
  created_at: string;
  completed_at: string | null;
  daysUntilExpiration: number | null;
  expirationStatus: string | null;
}

export default function BulkUploadPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bulkUploads, setBulkUploads] = useState<BulkUpload[]>([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTemplates();
    if (user) {
      fetchBulkUploads();
      const interval = setInterval(fetchBulkUploads, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchBulkUploads = async () => {
    if (!user) return;
    try {
      const response = await fetch(`http://localhost:3001/api/bulk-uploads/${user.id}`);
      const data = await response.json();
      if (data.success) {
        setBulkUploads(data.bulkUploads);
      }
    } catch (error) {
      console.error('Failed to fetch bulk uploads:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(fileExt)) {
      setMessage({ type: 'error', text: 'Please upload a CSV or Excel file' });
      return;
    }

    setSelectedFile(file);
    setMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedService || !user) {
      setMessage({ type: 'error', text: 'Please select a service and file' });
      return;
    }

    const template = templates.find(t => t.service_id === selectedService);
    if (!template) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('serviceId', selectedService);
      formData.append('userId', user.id);

      const response = await fetch('http://localhost:3001/api/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Bulk upload started! Processing ${data.bulkUpload.totalRows} rows...` });
        setSelectedFile(null);
        setSelectedService('');
        fetchBulkUploads();
      } else {
        setMessage({ type: 'error', text: data.message || 'Upload failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async (serviceId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/templates/${serviceId}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${serviceId}-template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDownloadResults = async (bulkUploadId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/bulk-uploads/${bulkUploadId}/download`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk_results_${bulkUploadId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      setMessage({ type: 'error', text: 'Download failed or results have expired' });
    }
  };

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];
  const filteredTemplates = filterCategory === 'all'
    ? templates
    : templates.filter(t => t.category === filterCategory);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getExpirationBadge = (upload: BulkUpload) => {
    if (!upload.expires_at || upload.status !== 'completed') return null;

    if (upload.expirationStatus === 'expired') {
      return <span className="text-red-600 text-sm">Expired</span>;
    }
    if (upload.expirationStatus === 'expiring-soon') {
      return <span className="text-orange-600 text-sm">Expires in {upload.daysUntilExpiration} days</span>;
    }
    return <span className="text-gray-600 text-sm">Expires in {upload.daysUntilExpiration} days</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Upload Automation</h1>
          <p className="text-gray-600">Upload CSV or Excel files to process multiple items at once. Results are stored for 7 days.</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p>{message.text}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Upload File</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Service</label>
                <div className="mb-2">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                    ))}
                  </select>
                </div>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={uploading}
                >
                  <option value="">Choose a service...</option>
                  {filteredTemplates.map(template => (
                    <option key={template.service_id} value={template.service_id}>
                      {template.service_name} ({template.credit_cost} credits/row)
                    </option>
                  ))}
                </select>
              </div>

              {selectedService && (
                <button
                  onClick={() => handleDownloadTemplate(selectedService)}
                  className="w-full mb-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              )}

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                }`}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-600 mb-2">Drag and drop your file here</p>
                <p className="text-xs text-gray-500 mb-4">or</p>
                <label className="cursor-pointer inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Browse Files
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              {selectedFile && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  </div>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || !selectedService || uploading}
                className="w-full mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {uploading ? 'Uploading...' : 'Start Bulk Processing'}
              </button>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Credits are deducted only for successfully processed rows. Results are available for 7 days.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Your Bulk Uploads</h2>

              {bulkUploads.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No bulk uploads yet</p>
                  <p className="text-sm text-gray-400 mt-2">Upload a file to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bulkUploads.map(upload => (
                    <div key={upload.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{upload.service_name}</h3>
                          <p className="text-sm text-gray-600">{upload.original_file_name}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(upload.status)}`}>
                          {upload.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Total Rows</p>
                          <p className="text-lg font-semibold text-gray-900">{upload.total_rows}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Processed</p>
                          <p className="text-lg font-semibold text-blue-600">{upload.processed_rows}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Success</p>
                          <p className="text-lg font-semibold text-green-600">{upload.successful_rows}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Failed</p>
                          <p className="text-lg font-semibold text-red-600">{upload.failed_rows}</p>
                        </div>
                      </div>

                      {upload.status === 'processing' && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Progress</span>
                            <span className="text-gray-900 font-medium">
                              {Math.round((upload.processed_rows / upload.total_rows) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(upload.processed_rows / upload.total_rows) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(upload.created_at).toLocaleDateString()}
                          </span>
                          <span>{upload.credits_used} credits used</span>
                          {getExpirationBadge(upload)}
                        </div>
                        {upload.status === 'completed' && upload.result_zip_path && (
                          <button
                            onClick={() => handleDownloadResults(upload.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Download ZIP
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
