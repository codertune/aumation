import React from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Loader,
  FileText,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface WorkHistoryItem {
  id: string;
  serviceName: string;
  fileName: string;
  creditsUsed: number;
  status: 'completed' | 'failed' | 'processing' | 'pending';
  createdAt: string;
  downloadUrl?: string;
  expiresAt?: string;
}

interface WorkHistoryPanelProps {
  workHistory: WorkHistoryItem[];
  isProcessing?: boolean;
}

export default function WorkHistoryPanel({ workHistory, isProcessing }: WorkHistoryPanelProps) {
  const getDaysUntilExpiration = (expiresAt?: string): number | null => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpirationBadge = (expiresAt?: string) => {
    const days = getDaysUntilExpiration(expiresAt);
    if (days === null) return null;

    if (days <= 0) {
      return (
        <span className="text-xs text-red-600 font-medium">
          Expired
        </span>
      );
    }

    if (days <= 2) {
      return (
        <span className="text-xs text-orange-600 font-medium">
          Expires in {days}d
        </span>
      );
    }

    return (
      <span className="text-xs text-gray-500">
        {days}d remaining
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    const labels = {
      completed: 'Completed',
      failed: 'Failed',
      processing: 'Processing',
      pending: 'Pending'
    };

    return (
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full border ${
          badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-200'
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const stats = {
    total: workHistory.length,
    completed: workHistory.filter(item => item.status === 'completed').length,
    processing: workHistory.filter(item => item.status === 'processing').length,
    failed: workHistory.filter(item => item.status === 'failed').length
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Work History</h2>
              <p className="text-sm text-gray-500">{stats.total} total tasks</p>
            </div>
          </div>
          {isProcessing && (
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-lg">
              <Loader className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-blue-600">Processing...</span>
            </div>
          )}
        </div>

        {stats.total > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Clock className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <span className="font-semibold">7-Day Storage:</span> Download your files within 7 days. Files are automatically deleted after expiration.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-600 font-medium mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-600 font-medium mb-1">Processing</p>
            <p className="text-2xl font-bold text-blue-700">{stats.processing}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <p className="text-xs text-red-600 font-medium mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {workHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium mb-2">No history yet</p>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              Your automation tasks will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workHistory.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="mt-1">{getStatusIcon(item.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm mb-1 truncate">
                        {item.serviceName}
                      </p>
                      <p className="text-xs text-gray-600 truncate mb-2">
                        {item.fileName}
                      </p>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{item.creditsUsed} credits</span>
                      </div>
                    </div>

                    {item.expiresAt && item.status === 'completed' && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {getExpirationBadge(item.expiresAt)}
                      </div>
                    )}
                  </div>

                  {item.downloadUrl && item.status === 'completed' && (
                    <a
                      href={item.downloadUrl}
                      download
                      className="flex items-center justify-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors w-full"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Results</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
