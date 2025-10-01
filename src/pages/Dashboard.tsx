import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  TrendingUp,
  Truck,
  CreditCard,
  Calendar,
  Filter,
  RefreshCw,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Building,
  BarChart3,
  DollarSign,
  Search
} from 'lucide-react';
import DamcoTrackingModal from '../components/DamcoTrackingModal';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
}

const allServices: Service[] = [
  { id: 'pdf-excel-converter', name: 'PDF to Excel/CSV Converter', description: 'Advanced PDF table extraction with intelligent recognition and multiple output formats.', category: 'PDF Extractor', features: ['Intelligent table detection', 'Multiple extraction methods', 'Excel/CSV output', 'Commercial document patterns'] },
  { id: 'exp-issue', name: 'Issue EXP', description: 'Automated EXP issuance through Bangladesh Bank portal with form filling and validation.', category: 'Bangladesh Bank', features: ['Automated form filling', 'Validation checks', 'Certificate download', 'Bulk processing'] },
  { id: 'exp-correction', name: 'Issued EXP Correction', description: 'Correct issued EXP details before duplicate reporting with automated form updates.', category: 'Bangladesh Bank', features: ['Error detection', 'Automated corrections', 'Pre-duplicate validation', 'Status tracking'] },
  { id: 'exp-duplicate-reporting', name: 'Duplicate EXP', description: 'Handle export acknowledgements and duplicate EXP reporting automatically.', category: 'Bangladesh Bank', features: ['Duplicate detection', 'Acknowledgement processing', 'Report generation', 'Compliance tracking'] },
  { id: 'exp-search', name: 'Search EXP Detail Information', description: 'Search and retrieve detailed EXP information from Bangladesh Bank database.', category: 'Bangladesh Bank', features: ['Advanced search', 'Detailed reports', 'Export to Excel', 'Historical data'] },
  { id: 'damco-booking', name: 'Damco (APM) - Booking', description: 'Automated booking creation through Damco APM portal with shipment details.', category: 'Forwarder Handler - Damco', features: ['Automated booking', 'Shipment scheduling', 'Container allocation', 'Booking confirmation'] },
  { id: 'damco-booking-download', name: 'Damco (APM) - Booking Download', description: 'Download booking confirmations and related documents from Damco portal.', category: 'Forwarder Handler - Damco', features: ['Document download', 'PDF extraction', 'Batch processing', 'File organization'] },
  { id: 'damco-fcr-submission', name: 'Damco (APM) - FCR Submission', description: 'Submit Forwarder Cargo Receipt (FCR) through Damco portal automatically.', category: 'Forwarder Handler - Damco', features: ['FCR automation', 'Document validation', 'Submission tracking', 'Status updates'] },
  { id: 'damco-fcr-extractor', name: 'Damco (APM) - FCR Extractor from Mail', description: 'Extract FCR documents from email attachments and process automatically.', category: 'Forwarder Handler - Damco', features: ['Email processing', 'Attachment extraction', 'OCR recognition', 'Data parsing'] },
  { id: 'damco-edoc-upload', name: 'Damco (APM) - E-Doc Upload', description: 'Upload electronic documents to Damco portal with automated categorization.', category: 'Forwarder Handler - Damco', features: ['Document upload', 'Auto categorization', 'Batch processing', 'Upload verification'] },
  { id: 'hm-einvoice-create', name: 'H&M - E-Invoice Create', description: 'Create electronic invoices in H&M supplier portal with automated data entry.', category: 'Buyer Handler - H&M', features: ['Invoice automation', 'Data validation', 'Multi-item support', 'Template matching'] },
  { id: 'hm-einvoice-download', name: 'H&M - E-Invoice Download', description: 'Download processed e-invoices and related documents from H&M portal.', category: 'Buyer Handler - H&M', features: ['Bulk download', 'PDF generation', 'Status tracking', 'Archive management'] },
  { id: 'hm-einvoice-correction', name: 'H&M - E-Invoice Correction', description: 'Correct and resubmit e-invoices with error handling and validation.', category: 'Buyer Handler - H&M', features: ['Error detection', 'Automated corrections', 'Resubmission', 'Approval tracking'] },
  { id: 'hm-packing-list', name: 'H&M - Download E-Packing List', description: 'Download electronic packing lists from H&M supplier portal.', category: 'Buyer Handler - H&M', features: ['Packing list download', 'Format conversion', 'Data extraction', 'Batch processing'] },
  { id: 'bepza-ep-issue', name: 'BEPZA - EP Issue', description: 'Issue Export Permits (EP) through BEPZA portal with automated form submission.', category: 'BEPZA', features: ['EP automation', 'Form validation', 'Document upload', 'Permit tracking'] },
  { id: 'bepza-ep-submission', name: 'BEPZA - EP Submission', description: 'Submit Export Permit applications with supporting documents to BEPZA.', category: 'BEPZA', features: ['Application submission', 'Document management', 'Status monitoring', 'Approval tracking'] },
  { id: 'bepza-ep-download', name: 'BEPZA - EP Download', description: 'Download approved Export Permits and certificates from BEPZA portal.', category: 'BEPZA', features: ['Permit download', 'Certificate extraction', 'Batch processing', 'File organization'] },
  { id: 'bepza-ip-issue', name: 'BEPZA - IP Issue', description: 'Issue Import Permits (IP) through BEPZA portal with automated processing.', category: 'BEPZA', features: ['IP automation', 'Compliance checks', 'Document validation', 'Permit generation'] },
  { id: 'bepza-ip-submit', name: 'BEPZA - IP Submit', description: 'Submit Import Permit applications with required documentation to BEPZA.', category: 'BEPZA', features: ['Application processing', 'Document upload', 'Validation checks', 'Submission tracking'] },
  { id: 'bepza-ip-download', name: 'BEPZA - IP Download', description: 'Download approved Import Permits and related documents from BEPZA.', category: 'BEPZA', features: ['Permit retrieval', 'Document download', 'Status updates', 'Archive management'] },
  { id: 'cash-incentive-application', name: 'Cash Incentive Application', description: 'Submit cash incentive applications through multiple government portals.', category: 'Cash Incentive Applications', features: ['Multi-portal support', 'Document upload', 'Application tracking', 'Status monitoring'] },
  { id: 'ctg-port-tracking', name: 'CTG Port Authority Tracking', description: 'Track shipments through Chittagong Port Authority with real-time updates.', category: 'Tracking Services', features: ['Real-time tracking', 'Port status', 'Vessel information', 'ETA updates'] },
  { id: 'damco-tracking-maersk', name: 'Damco (APM) Tracking', description: 'Track shipments through Damco APM with detailed status reports.', category: 'Tracking Services', features: ['Container tracking', 'Status updates', 'Route information', 'Delivery confirmation'] },
  { id: 'myshipment-tracking', name: 'MyShipment Tracking (MGH)', description: 'Track shipments through MyShipment MGH platform with comprehensive details.', category: 'Tracking Services', features: ['Multi-carrier tracking', 'Status notifications', 'Delivery updates', 'Historical data'] },
  { id: 'egm-download', name: 'EGM Download', description: 'Download Export General Manifest (EGM) documents from relevant portals.', category: 'Tracking Services', features: ['EGM retrieval', 'Document download', 'Format conversion', 'Batch processing'] },
  { id: 'custom-tracking', name: 'Custom Tracking', description: 'Track customs clearance status with automated status updates.', category: 'Tracking Services', features: ['Customs tracking', 'Clearance status', 'Document verification', 'Process monitoring'] }
];

const categoryIcons: { [key: string]: React.ReactNode } = {
  'PDF Extractor': <FileText className="h-5 w-5" />,
  'Bangladesh Bank': <Globe className="h-5 w-5" />,
  'Forwarder Handler - Damco': <Truck className="h-5 w-5" />,
  'Buyer Handler - H&M': <Building className="h-5 w-5" />,
  'BEPZA': <BarChart3 className="h-5 w-5" />,
  'Cash Incentive Applications': <DollarSign className="h-5 w-5" />,
  'Tracking Services': <Truck className="h-5 w-5" />
};

export default function Dashboard() {
  const { user, deductCredits, addWorkHistory, getServiceCreditCost, isServiceEnabled } = useAuth();
  const [showDamcoModal, setShowDamcoModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed'>('all');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedService) {
      alert('Please select a file first');
      return;
    }

    const credits = getServiceCreditCost(selectedService);

    if (!deductCredits(credits)) {
      alert('Insufficient credits. Please purchase more credits.');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('serviceId', selectedService);
      formData.append('userId', user!.id);

      const response = await fetch('/api/process-automation', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const service = allServices.find(s => s.id === selectedService);
        addWorkHistory(user!.id, {
          serviceId: selectedService,
          serviceName: service?.name || result.serviceName,
          fileName: selectedFile.name,
          creditsUsed: credits,
          status: 'completed',
          resultFiles: result.resultFiles || [],
          downloadUrl: result.downloadUrl
        });

        alert('Automation completed successfully!');
        setSelectedFile(null);
        setSelectedService(null);
      } else {
        alert('Automation failed: ' + result.message);
      }
    } catch (error: any) {
      alert('Error processing automation: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const enabledServices = allServices.filter(service => isServiceEnabled(service.id));
  const categories = Array.from(new Set(enabledServices.map(service => service.category)));

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getCategoryServices = (category: string) => {
    return enabledServices.filter(service => service.category === category);
  };

  const filteredServices = enabledServices.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const frequentServices = user?.workHistory
    ?.reduce((acc: { [key: string]: number }, item) => {
      acc[item.serviceId] = (acc[item.serviceId] || 0) + 1;
      return acc;
    }, {})
    || {};

  const topFrequentServices = Object.entries(frequentServices)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6)
    .map(([serviceId]) => enabledServices.find(s => s.id === serviceId))
    .filter(Boolean) as Service[];

  const handleServiceClick = (serviceId: string) => {
    if (serviceId === 'damco-tracking-maersk') {
      setShowDamcoModal(true);
      return;
    }

    setSelectedService(serviceId);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls,.pdf';
    input.onchange = (e: any) => {
      setSelectedFile(e.target.files[0]);
    };
    input.click();
  };

  const filteredHistory = user?.workHistory.filter(item =>
    filterStatus === 'all' || item.status === filterStatus
  ) || [];

  const stats = {
    totalProcesses: user?.workHistory.length || 0,
    creditsUsed: user?.workHistory.reduce((sum, item) => sum + item.creditsUsed, 0) || 0,
    successRate: user?.workHistory.length
      ? ((user.workHistory.filter(w => w.status === 'completed').length / user.workHistory.length) * 100).toFixed(1)
      : '0'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Available Credits</p>
                <p className="text-3xl font-bold text-blue-600">{user?.credits}</p>
              </div>
              <CreditCard className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Processes</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalProcesses}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Credits Used</p>
                <p className="text-3xl font-bold text-orange-600">{stats.creditsUsed}</p>
              </div>
              <Calendar className="h-12 w-12 text-orange-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Success Rate</p>
                <p className="text-3xl font-bold text-green-600">{stats.successRate}%</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500 opacity-20" />
            </div>
          </div>
        </div>

        {topFrequentServices.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Used Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topFrequentServices.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.id)}
                  className="flex items-center p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white mr-3">
                    {categoryIcons[service.category]}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{service.name}</p>
                    <p className="text-xs text-gray-500">{getServiceCreditCost(service.id)} credits</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">All Services ({enabledServices.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {searchQuery ? (
            <div className="space-y-3">
              {filteredServices.map(service => (
                <div key={service.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                        {categoryIcons[service.category]}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{service.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-500">{service.category}</span>
                          <span className="text-xs font-medium text-blue-600">{getServiceCreditCost(service.id)} credits</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleServiceClick(service.id)}
                      className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all flex-shrink-0"
                    >
                      Use Service
                    </button>
                  </div>
                </div>
              ))}
              {filteredServices.length === 0 && (
                <p className="text-center text-gray-500 py-8">No services found matching your search.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map(category => {
                const categoryServices = getCategoryServices(category);
                const isExpanded = expandedCategories.includes(category);

                return (
                  <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                          {categoryIcons[category]}
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900">{category}</h3>
                          <p className="text-sm text-gray-500">{categoryServices.length} services</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <div className="space-y-3">
                          {categoryServices.map(service => (
                            <div key={service.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1">{service.name}</h4>
                                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {service.features.slice(0, 3).map((feature, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        {feature}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="mt-3 flex items-center space-x-2">
                                    <CreditCard className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium text-blue-600">{getServiceCreditCost(service.id)} credits</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleServiceClick(service.id)}
                                  className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all flex-shrink-0"
                                >
                                  Use Service
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Upload className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">File Ready</p>
                  <p className="text-sm text-gray-600">{selectedFile.name}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Start Processing
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Work History</h2>
            <div className="flex items-center space-x-3">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No work history found. Start by using one of the services above!
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.serviceName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{item.fileName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.creditsUsed}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.status === 'completed' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center w-fit">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center w-fit">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.downloadUrl && (
                          <a
                            href={item.downloadUrl}
                            download
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DamcoTrackingModal
        isOpen={showDamcoModal}
        onClose={() => setShowDamcoModal(false)}
      />
    </div>
  );
}