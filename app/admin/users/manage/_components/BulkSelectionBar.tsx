'use client';

import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';

interface BulkSelectionBarProps {
  selectedCount: number;
  sendingEmails: boolean;
  deletingUsers: boolean;
  onSendWelcomeEmails: () => void;
  onSendCustomEmail: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export default function BulkSelectionBar({
  selectedCount, sendingEmails, deletingUsers,
  onSendWelcomeEmails, onSendCustomEmail, onBulkDelete, onClearSelection,
}: BulkSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} user(s) selected
        </span>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSendWelcomeEmails} disabled={sendingEmails} className="bg-green-600 hover:bg-green-700">
          {sendingEmails ? (
            <><Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 mr-2 animate-spin" />Sending...</>
          ) : (
            <><Icon icon="material-symbols:mail" className="w-4 h-4 mr-2" />Send Welcome Email</>
          )}
        </Button>
        <Button onClick={onSendCustomEmail} className="bg-blue-600 hover:bg-blue-700">
          <Icon icon="material-symbols:forward-to-inbox" className="w-4 h-4 mr-2" />
          Send Custom Email
        </Button>
        <Button onClick={onBulkDelete} disabled={deletingUsers} className="bg-red-600 hover:bg-red-700">
          {deletingUsers ? (
            <><Icon icon="material-symbols:hourglass-empty" className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
          ) : (
            <><Icon icon="material-symbols:delete" className="w-4 h-4 mr-2" />Delete Selected</>
          )}
        </Button>
        <Button onClick={onClearSelection} variant="outline" className="border-gray-300">
          <Icon icon="material-symbols:close" className="w-4 h-4 mr-2" />
          Clear Selection
        </Button>
      </div>
    </div>
  );
}
