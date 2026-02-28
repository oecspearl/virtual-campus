'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';

interface User {
  id: string;
  name: string;
  email: string;
}

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUsers: User[];
  onSuccess?: () => void;
}

export default function BulkEmailModal({
  isOpen,
  onClose,
  selectedUsers,
  onSuccess,
}: BulkEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      alert('Please enter both subject and message');
      return;
    }

    setSending(true);
    setResults(null);

    try {
      const response = await fetch('/api/admin/users/bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers.map(u => u.id),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults({
          sent: data.sent || 0,
          failed: data.failed || 0,
          errors: data.errors || [],
        });

        if (data.sent > 0 && data.failed === 0) {
          setTimeout(() => {
            onClose();
            setSubject('');
            setMessage('');
            setResults(null);
            onSuccess?.();
          }, 2000);
        }
      } else {
        setResults({
          sent: 0,
          failed: selectedUsers.length,
          errors: [data.error || 'Failed to send emails'],
        });
      }
    } catch (error) {
      setResults({
        sent: 0,
        failed: selectedUsers.length,
        errors: ['Network error. Please try again.'],
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
      setSubject('');
      setMessage('');
      setResults(null);
    }
  };

  const insertVariable = (variable: string) => {
    setMessage(prev => prev + `{{${variable}}}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon icon="material-symbols:mail" className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Send Bulk Email</h2>
              <p className="text-sm text-gray-500">
                Send email to {selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={sending}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <Icon icon="material-symbols:close" className="w-5 h-5" />
          </button>
        </div>

        {/* Recipients Preview */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Icon icon="material-symbols:group" className="w-4 h-4" />
            <span className="font-medium">Recipients:</span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {selectedUsers.slice(0, 10).map(user => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded-full text-xs"
              >
                <Icon icon="material-symbols:person" className="w-3 h-3" />
                {user.name || user.email}
              </span>
            ))}
            {selectedUsers.length > 10 && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                +{selectedUsers.length - 10} more
              </span>
            )}
          </div>
        </div>

        {/* Email Form */}
        <div className="p-6 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={sending}
            />
          </div>

          {/* Template Variables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insert Variables
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => insertVariable('name')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                disabled={sending}
              >
                {'{{name}}'} - User Name
              </button>
              <button
                type="button"
                onClick={() => insertVariable('email')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                disabled={sending}
              >
                {'{{email}}'} - User Email
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Click to insert personalization variables into your message
            </p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here...&#10;&#10;You can use {{name}} to personalize with the recipient's name."
              rows={8}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={sending}
            />
            <p className="text-xs text-gray-500 mt-1">
              Plain text only. Line breaks will be preserved.
            </p>
          </div>

          {/* Results */}
          {results && (
            <div className={`p-4 rounded-lg ${
              results.failed === 0 ? 'bg-green-50 border border-green-200' :
              results.sent > 0 ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                <Icon
                  icon={results.failed === 0 ? 'material-symbols:check-circle' :
                        results.sent > 0 ? 'material-symbols:warning' :
                        'material-symbols:error'}
                  className={`w-5 h-5 mt-0.5 ${
                    results.failed === 0 ? 'text-green-600' :
                    results.sent > 0 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}
                />
                <div>
                  <p className={`font-medium ${
                    results.failed === 0 ? 'text-green-800' :
                    results.sent > 0 ? 'text-yellow-800' :
                    'text-red-800'
                  }`}>
                    {results.failed === 0 ? 'All emails sent successfully!' :
                     results.sent > 0 ? `Partial success: ${results.sent} sent, ${results.failed} failed` :
                     'Failed to send emails'}
                  </p>
                  {results.errors.length > 0 && (
                    <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                      {results.errors.slice(0, 3).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {results.errors.length > 3 && (
                        <li>...and {results.errors.length - 3} more errors</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <>
                <Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Icon icon="material-symbols:send" className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
