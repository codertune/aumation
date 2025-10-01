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
  PlayCircle
} from 'lucide-react';
import DamcoTrackingModal from '../components/DamcoTrackingModal';

export default function Dashboard() {
  const { user, deductCredits, addWorkHistory, getServiceCreditCost } = useAuth();
  const [showDamcoModal, setShowDamcoModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed'>('all');

  const handleFileUpload = async (serviceId: string) => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    const credits = getServiceCreditCost(serviceId);

    if (!deductCredits(credits)) {
      alert('Insufficient credits. Please purchase more credits.');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('serviceId', serviceId);
      formData.append('userId', user!.id);

      const response = await fetch('/api/process-automation', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        addWorkHistory(user!.id, {
          serviceId: serviceId,
          serviceName: result.serviceName,
          fileName: selectedFile.name,
          creditsUsed: credits,
          status: 'completed',
          resultFiles: result.resultFiles || [],
          downloadUrl: result.downloadUrl
        });

        alert('Automation completed successfully!');
        setSelectedFile(null);
      } else {
        alert('Automation failed: ' + result.message);
      }
    } catch (error: any) {
      alert('Error processing automation: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickActions = [
    {
      id: 'damco-tracking-maersk',
      name: 'Damco Tracking',
      icon: Truck,
      color: 'blue',
      action: () => setShowDamcoModal(true)
    },
    {
      id: 'ctg-port-tracking',
      name: 'CTG Port Tracking',
      icon: Truck,
      color: 'green',
      action: () => handleServiceClick('ctg-port-tracking')
    },
    {
      id: 'pdf-excel-converter',
      name: 'PDF Converter',
      icon: FileText,
      color: 'purple',
      action: () => handleServiceClick('pdf-excel-converter')
    }
  ];

  const handleServiceClick = (serviceId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
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

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="flex items-center p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <Icon className="h-8 w-8 text-blue-600 mr-3" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{action.name}</p>
                    <p className="text-sm text-gray-500">{getServiceCreditCost(action.id)} credits</p>
                  </div>
                </button>
              );
            })}
          </div>
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
                  onClick={() => handleFileUpload('damco-tracking-maersk')}
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