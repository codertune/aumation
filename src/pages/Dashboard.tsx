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
  Globe,
  Building,
  BarChart3,
  DollarSign
} from 'lucide-react';
import DamcoTrackingModal from '../components/DamcoTrackingModal';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
}

const allServices: Service[] = [
  { id: 'pdf-excel-converter', name: 'PDF to Excel/CSV', description: 'Convert PDF tables to Excel/CSV with intelligent recognition', category: 'PDF Extractor', icon: <FileText className="h-5 w-5" /> },
  { id: 'exp-issue', name: 'Issue EXP', description: 'Automated EXP issuance through Bangladesh Bank portal', category: 'Bangladesh Bank', icon: <Globe className="h-5 w-5" /> },
  { id: 'exp-correction', name: 'Issued EXP Correction', description: 'Correct issued EXP details before duplicate reporting', category: 'Bangladesh Bank', icon: <Globe className="h-5 w-5" /> },
  { id: 'exp-duplicate-reporting', name: 'Duplicate EXP', description: 'Handle export acknowledgements and duplicate EXP reporting', category: 'Bangladesh Bank', icon: <Globe className="h-5 w-5" /> },
  { id: 'exp-search', name: 'Search EXP Details', description: 'Search and retrieve detailed EXP information from database', category: 'Bangladesh Bank', icon: <Globe className="h-5 w-5" /> },
  { id: 'damco-booking', name: 'Damco Booking', description: 'Automated booking creation through Damco APM portal', category: 'Forwarder Handler', icon: <Truck className="h-5 w-5" /> },
  { id: 'damco-booking-download', name: 'Damco Booking Download', description: 'Download booking confirmations and related documents', category: 'Forwarder Handler', icon: <Truck className="h-5 w-5" /> },
  { id: 'damco-fcr-submission', name: 'Damco FCR Submission', description: 'Submit Forwarder Cargo Receipt through Damco portal', category: 'Forwarder Handler', icon: <Truck className="h-5 w-5" /> },
  { id: 'damco-fcr-extractor', name: 'Damco FCR Extractor', description: 'Extract FCR documents from email attachments', category: 'Forwarder Handler', icon: <Truck className="h-5 w-5" /> },
  { id: 'damco-edoc-upload', name: 'Damco E-Doc Upload', description: 'Upload electronic documents to Damco portal', category: 'Forwarder Handler', icon: <Truck className="h-5 w-5" /> },
  { id: 'hm-einvoice-create', name: 'H&M E-Invoice Create', description: 'Create electronic invoices in H&M supplier portal', category: 'Buyer Handler', icon: <Building className="h-5 w-5" /> },
  { id: 'hm-einvoice-download', name: 'H&M E-Invoice Download', description: 'Download processed e-invoices and related documents', category: 'Buyer Handler', icon: <Building className="h-5 w-5" /> },
  { id: 'hm-einvoice-correction', name: 'H&M E-Invoice Correction', description: 'Correct and resubmit e-invoices with error handling', category: 'Buyer Handler', icon: <Building className="h-5 w-5" /> },
  { id: 'hm-packing-list', name: 'H&M E-Packing List', description: 'Download electronic packing lists from H&M portal', category: 'Buyer Handler', icon: <Building className="h-5 w-5" /> },
  { id: 'bepza-ep-issue', name: 'BEPZA EP Issue', description: 'Issue Export Permits through BEPZA portal', category: 'BEPZA', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'bepza-ep-submission', name: 'BEPZA EP Submission', description: 'Submit Export Permit applications to BEPZA', category: 'BEPZA', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'bepza-ep-download', name: 'BEPZA EP Download', description: 'Download approved Export Permits and certificates', category: 'BEPZA', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'bepza-ip-issue', name: 'BEPZA IP Issue', description: 'Issue Import Permits through BEPZA portal', category: 'BEPZA', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'bepza-ip-submit', name: 'BEPZA IP Submit', description: 'Submit Import Permit applications to BEPZA', category: 'BEPZA', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'bepza-ip-download', name: 'BEPZA IP Download', description: 'Download approved Import Permits and documents', category: 'BEPZA', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'cash-incentive-application', name: 'Cash Incentive Application', description: 'Submit cash incentive applications through portals', category: 'Cash Incentive', icon: <DollarSign className="h-5 w-5" /> },
  { id: 'ctg-port-tracking', name: 'CTG Port Tracking', description: 'Track shipments through Chittagong Port Authority', category: 'Tracking', icon: <Truck className="h-5 w-5" /> },
  { id: 'damco-tracking-maersk', name: 'Damco (APM) Tracking', description: 'Track shipments through Damco APM portal', category: 'Tracking', icon: <Truck className="h-5 w-5" /> },
  { id: 'myshipment-tracking', name: 'MyShipment Tracking', description: 'Track shipments through MyShipment MGH platform', category: 'Tracking', icon: <Truck className="h-5 w-5" /> },
  { id: 'egm-download', name: 'EGM Download', description: 'Download Export General Manifest documents', category: 'Tracking', icon: <Truck className="h-5 w-5" /> },
  { id: 'custom-tracking', name: 'Custom Tracking', description: 'Track customs clearance status and updates', category: 'Tracking', icon: <Truck className="h-5 w-5" /> }
];

export default function Dashboard() {
  const { user, deductCredits, addWorkHistory, getServiceCreditCost, isServiceEnabled } = useAuth();
  const [showDamcoModal, setShowDamcoModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed'>('all');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-lg text-gray-600">Welcome back, {user?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Available Credits</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">{user?.credits}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Processes</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">{stats.totalProcesses}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Credits Used</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">{stats.creditsUsed}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Calendar className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Success Rate</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">{stats.successRate}%</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {topFrequentServices.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Used Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topFrequentServices.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.id)}
                  className="group flex items-center p-5 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white mr-4 group-hover:scale-110 transition-transform">
                    {service.icon}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900 text-sm mb-1">{service.name}</p>
                    <p className="text-xs text-blue-600 font-medium">{getServiceCreditCost(service.id)} credits</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Services</h2>
            <p className="text-gray-600">Browse and select from {enabledServices.length} available automation services</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {enabledServices.map(service => (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service.id)}
                className="group text-left p-5 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50"
              >
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                    {service.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{service.name}</h4>
                    <p className="text-xs text-gray-500 mb-2">{service.category}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{service.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs font-semibold text-blue-600">{getServiceCreditCost(service.id)} credits</span>
                  <span className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">Click to use →</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedFile && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">File Ready for Processing</p>
                  <p className="text-sm text-gray-600">{selectedFile.name}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-5 py-2.5 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center font-medium transition-all shadow-md"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Start Processing
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Work History</h2>
              <p className="text-gray-600 text-sm">Track all your automation processes</p>
            </div>
            <div className="flex items-center space-x-3">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">File</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium mb-1">No work history found</p>
                        <p className="text-gray-400 text-sm">Start by using one of the services above</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.serviceName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{item.fileName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{item.creditsUsed}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.status === 'completed' ? (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center w-fit">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center w-fit">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.downloadUrl && (
                          <a
                            href={item.downloadUrl}
                            download
                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
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
