import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  Globe,
  Truck,
  Building,
  BarChart3,
  DollarSign,
  CreditCard,
  TrendingUp,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import ServiceSelector from '../components/ServiceSelector';
import FileUploadZone from '../components/FileUploadZone';
import CreditCalculator from '../components/CreditCalculator';
import WorkHistoryPanel from '../components/WorkHistoryPanel';

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

export default function NewDashboard() {
  const { user, deductCredits, addWorkHistory, getServiceCreditCost, isServiceEnabled } = useAuth();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successResult, setSuccessResult] = useState<any>(null);

  const enabledServices = allServices.filter(service => isServiceEnabled(service.id));

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedFile(null);
    setRowCount(0);
    setTotalCredits(0);
    setShowConfirmation(false);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setShowConfirmation(false);
  };

  const handleFileClear = () => {
    setSelectedFile(null);
    setRowCount(0);
    setTotalCredits(0);
    setShowConfirmation(false);
  };

  const handleCalculationComplete = (rows: number, credits: number) => {
    setRowCount(rows);
    setTotalCredits(credits);
    setShowConfirmation(true);
  };

  const handleProcessAutomation = async () => {
    if (!selectedFile || !selectedService || totalCredits === 0) {
      console.error('Missing required fields:', { selectedFile, selectedService, totalCredits });
      return;
    }

    if (user && user.credits < totalCredits) {
      alert('Insufficient credits. Please purchase more credits.');
      return;
    }

    if (!deductCredits(totalCredits)) {
      alert('Failed to deduct credits. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('serviceId', selectedService.id);
      formData.append('userId', user!.id);

      console.log('=== Starting automation ===');
      console.log('Service ID:', selectedService.id);
      console.log('Service Name:', selectedService.name);
      console.log('File:', selectedFile.name);
      console.log('User ID:', user!.id);

      const response = await fetch('/api/process-automation', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      console.log('Automation result:', result);

      if (result.success) {
        addWorkHistory(user!.id, {
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          fileName: selectedFile.name,
          creditsUsed: totalCredits,
          status: 'completed',
          resultFiles: result.resultFiles || [],
          downloadUrl: result.downloadUrl
        });

        setSuccessResult(result);
        setShowSuccessModal(true);
        setSelectedService(null);
        setSelectedFile(null);
        setRowCount(0);
        setTotalCredits(0);
        setShowConfirmation(false);
      } else {
        console.error('Automation failed:', result);
        const errorMsg = result.error || result.message || 'Unknown error';
        const details = result.details ? `\nExit code: ${result.details.exitCode}` : '';
        alert('Automation failed: ' + errorMsg + details);
      }
    } catch (error: any) {
      console.error('Error processing automation:', error);
      alert('Error processing automation: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = {
    totalProcesses: user?.workHistory.length || 0,
    creditsUsed: user?.workHistory.reduce((sum, item) => sum + item.creditsUsed, 0) || 0,
    successRate: user?.workHistory.length
      ? ((user.workHistory.filter(w => w.status === 'completed').length / user.workHistory.length) * 100).toFixed(0)
      : '0',
    todayProcesses: user?.workHistory.filter(item => {
      const today = new Date().toDateString();
      const itemDate = new Date(item.createdAt).toDateString();
      return today === itemDate;
    }).length || 0
  };

  const creditPercentage = user ? Math.min((user.credits / 1000) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}
          </h1>
          <p className="text-lg text-gray-600">
            Automate your business processes with ease
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium text-blue-600">{creditPercentage.toFixed(0)}%</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Available Credits</p>
            <p className="text-3xl font-bold text-gray-900 mb-3">{user?.credits || 0}</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${creditPercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Today's Tasks</p>
            <p className="text-3xl font-bold text-gray-900">{stats.todayProcesses}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Total Processes</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProcesses}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Success Rate</p>
            <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Start New Automation
                </h2>
                <p className="text-gray-600">
                  Select a service and upload your file to get started
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Step 1: Select Service
                  </label>
                  <ServiceSelector
                    services={enabledServices}
                    selectedService={selectedService}
                    onSelect={handleServiceSelect}
                  />
                </div>

                {selectedService && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-gray-700">
                          Step 2: Upload File
                        </label>
                        <a
                          href={`/templates/${selectedService.id}-template.csv`}
                          download
                          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Sample</span>
                        </a>
                      </div>
                      <FileUploadZone
                        onFileSelect={handleFileSelect}
                        selectedFile={selectedFile}
                        onClear={handleFileClear}
                      />
                    </div>

                    {selectedFile && (
                      <CreditCalculator
                        file={selectedFile}
                        serviceId={selectedService.id}
                        creditCostPerUnit={getServiceCreditCost(selectedService.id)}
                        onCalculationComplete={handleCalculationComplete}
                      />
                    )}

                    {showConfirmation && selectedFile && totalCredits > 0 && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6">
                        <div className="flex items-start space-x-4 mb-6">
                          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              Ready to Process
                            </h3>
                            <p className="text-gray-700 mb-4">
                              This automation will process {rowCount} {rowCount === 1 ? 'item' : 'items'} and use {totalCredits} credits.
                            </p>
                            {user && user.credits < totalCredits && (
                              <div className="flex items-start space-x-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">
                                  Insufficient credits. You need {totalCredits} credits but only have {user.credits} available.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={handleProcessAutomation}
                          disabled={isProcessing || (user && user.credits < totalCredits)}
                          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-5 w-5" />
                              <span>Start Automation</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <WorkHistoryPanel
              workHistory={user?.workHistory || []}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </div>

      {showSuccessModal && successResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Automation Complete!
              </h3>
              <p className="text-gray-600">
                Successfully processed your files
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Files Generated:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {successResult.resultFiles?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Service:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {successResult.serviceName}
                  </span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">
                    <span className="font-semibold">Important:</span> Files will be available for download for 7 days, then automatically deleted.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {successResult.downloadUrl && (
                <a
                  href={successResult.downloadUrl}
                  download
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Results</span>
                </a>
              )}

              {successResult.resultFiles && successResult.resultFiles.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">Generated Files:</p>
                  <div className="space-y-1">
                    {successResult.resultFiles.map((file: string, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs text-gray-700">
                        <FileText className="h-3 w-3 text-blue-500" />
                        <span className="truncate">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessResult(null);
                }}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
