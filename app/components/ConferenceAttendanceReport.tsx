'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  Download,
  UserCheck,
  UserX,
  RefreshCw,
  X
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number;
  status: 'active' | 'left';
}

interface AttendanceSummary {
  total_participants: number;
  active_participants: number;
  average_duration_minutes: number;
}

interface ConferenceInfo {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
}

interface ConferenceAttendanceReportProps {
  conferenceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConferenceAttendanceReport({
  conferenceId,
  isOpen,
  onClose
}: ConferenceAttendanceReportProps) {
  const [loading, setLoading] = useState(true);
  const [conference, setConference] = useState<ConferenceInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/conferences/${conferenceId}/attendance`);
      const data = await response.json();

      if (response.ok) {
        setConference(data.conference);
        setAttendance(data.attendance);
        setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to fetch attendance');
      }
    } catch (err) {
      setError('Failed to fetch attendance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && conferenceId) {
      fetchAttendance();
    }
  }, [isOpen, conferenceId]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    if (!attendance.length) return;

    const headers = ['Name', 'Email', 'Role', 'Joined At', 'Left At', 'Duration (min)', 'Status'];
    const rows = attendance.map(a => [
      a.name,
      a.email,
      a.role,
      a.joined_at ? new Date(a.joined_at).toLocaleString() : '',
      a.left_at ? new Date(a.left_at).toLocaleString() : 'Still in session',
      a.duration_minutes.toString(),
      a.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${conference?.title || conferenceId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Attendance Report</h2>
              {conference && (
                <p className="text-blue-100 text-sm">{conference.title}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchAttendance}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Participants</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {summary.total_participants}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Currently Active</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {summary.active_participants}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Duration</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatDuration(summary.average_duration_minutes)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Participant Details</h3>
                <div className="flex gap-2">
                  <button
                    onClick={fetchAttendance}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button
                    onClick={exportToCSV}
                    disabled={!attendance.length}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Attendance Table */}
              {attendance.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No participants have joined this session yet.</p>
                </div>
              ) : (
                <div className="border dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                          Participant
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                          Joined
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                          Left
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {attendance.map(record => (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {record.avatar ? (
                                <img
                                  src={record.avatar}
                                  alt={record.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {record.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                  {record.name}
                                </p>
                                <p className="text-xs text-gray-500">{record.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.role === 'host'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {record.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {record.joined_at ? formatTime(record.joined_at) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {record.left_at ? formatTime(record.left_at) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {formatDuration(record.duration_minutes)}
                          </td>
                          <td className="px-4 py-3">
                            {record.status === 'active' ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                <UserCheck className="w-4 h-4" />
                                Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-500 text-sm">
                                <UserX className="w-4 h-4" />
                                Left
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
