import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Loader, Users, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

interface Job {
  id: string;
  service_name: string;
  file_name: string;
  status: string;
  queue_position: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface QueueInfo {
  pendingJobs: number;
  processingJobs: number;
  activeWorkers: number;
  avgExecutionTimeSeconds: number;
  estimatedWaitTimeSeconds: number | null;
  queueHealthy: boolean;
}

interface QueueStatusProps {
  jobId?: string;
  userId: string;
  onComplete?: (job: Job) => void;
}

export function QueueStatus({ jobId, userId, onComplete }: QueueStatusProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    const fetchJobStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/queue/status/${jobId}?userId=${userId}`);
        if (response.data.success) {
          setJob(response.data.job);

          if (response.data.job.status === 'completed' || response.data.job.status === 'failed') {
            if (onComplete) {
              onComplete(response.data.job);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchQueueInfo = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/queue/info`);
        if (response.data.success) {
          setQueueInfo(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch queue info:', error);
      }
    };

    fetchJobStatus();
    fetchQueueInfo();

    const jobInterval = setInterval(fetchJobStatus, 5000);
    const queueInterval = setInterval(fetchQueueInfo, 10000);

    return () => {
      clearInterval(jobInterval);
      clearInterval(queueInterval);
    };
  }, [jobId, userId, onComplete]);

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-600">Loading job status...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-8 text-gray-500">
        Job not found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`border-2 rounded-lg p-6 ${getStatusColor(job.status)}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(job.status)}
            <div>
              <h3 className="font-semibold text-lg capitalize">{job.status}</h3>
              <p className="text-sm text-gray-600">{job.service_name}</p>
            </div>
          </div>
          {job.queue_position && job.status === 'pending' && (
            <div className="bg-white rounded-full px-3 py-1 border border-gray-200">
              <span className="text-sm font-medium">
                Position: #{job.queue_position}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">File:</span>
            <span className="font-medium">{job.file_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Submitted:</span>
            <span className="font-medium">
              {new Date(job.created_at).toLocaleString()}
            </span>
          </div>
          {job.started_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Started:</span>
              <span className="font-medium">
                {new Date(job.started_at).toLocaleString()}
              </span>
            </div>
          )}
          {job.completed_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Completed:</span>
              <span className="font-medium">
                {new Date(job.completed_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {job.status === 'failed' && job.error_message && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded text-sm text-red-800">
            <strong>Error:</strong> {job.error_message}
          </div>
        )}

        {job.status === 'pending' && queueInfo && queueInfo.estimatedWaitTimeSeconds && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded text-sm text-blue-800">
            <strong>Estimated wait time:</strong> {formatDuration(queueInfo.estimatedWaitTimeSeconds)}
          </div>
        )}

        {job.status === 'processing' && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded text-sm text-blue-800">
            <div className="flex items-center space-x-2">
              <Loader className="h-4 w-4 animate-spin" />
              <span>Your automation is currently running...</span>
            </div>
          </div>
        )}
      </div>

      {queueInfo && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Queue Information
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex items-center space-x-2 text-gray-600 mb-1">
                <Clock className="h-4 w-4" />
                <span>Pending</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {queueInfo.pendingJobs}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-gray-600 mb-1">
                <Loader className="h-4 w-4" />
                <span>Processing</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {queueInfo.processingJobs}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-gray-600 mb-1">
                <Users className="h-4 w-4" />
                <span>Workers</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {queueInfo.activeWorkers}
              </div>
            </div>
          </div>
          {!queueInfo.queueHealthy && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ No active workers detected. Please contact support.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
