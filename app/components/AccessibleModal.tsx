'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap, AriaHelpers, KeyboardNav, useAnnounce } from '@/lib/accessibility-utils';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

/**
 * Accessible Modal Component
 *
 * Implements WCAG 2.1 AA compliance:
 * - Focus trapping within modal
 * - Proper ARIA attributes (dialog, modal, labelledby, describedby)
 * - Escape key to close
 * - Focus returns to trigger element on close
 * - Screen reader announcements
 */
export default function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}: AccessibleModalProps) {
  // Focus trap hook
  const containerRef = useFocusTrap(isOpen);
  const announce = useAnnounce();

  // Store the element that opened the modal
  const triggerRef = typeof document !== 'undefined' ? document.activeElement as HTMLElement : null;

  // Unique IDs for ARIA
  const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description ? `modal-desc-${Math.random().toString(36).substr(2, 9)}` : undefined;

  // Handle escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (closeOnEscape && KeyboardNav.isEscapeKey(event as unknown as React.KeyboardEvent)) {
      event.preventDefault();
      onClose();
    }
  }, [closeOnEscape, onClose]);

  // Set up event listeners and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Announce modal opening
    announce(`${title} dialog opened`, 'polite');

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Add escape key listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      // Restore body scroll
      document.body.style.overflow = originalOverflow;

      // Remove escape key listener
      document.removeEventListener('keydown', handleKeyDown);

      // Return focus to trigger element
      if (triggerRef && typeof triggerRef.focus === 'function') {
        setTimeout(() => triggerRef.focus(), 0);
      }

      // Announce modal closing
      announce('Dialog closed', 'polite');
    };
  }, [isOpen, handleKeyDown, announce, title, triggerRef]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        {/* Modal panel */}
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={`
            relative w-full ${sizeClasses[size]}
            bg-white rounded-lg shadow-xl
            transform transition-all
            ${className}
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-200">
            <div>
              <h2
                id={titleId}
                className="text-lg font-semibold text-gray-900"
              >
                {title}
              </h2>
              {description && (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm text-gray-500"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 -m-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Accessible Modal Footer Component
 * Use inside AccessibleModal for action buttons
 */
export function ModalFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Example usage:
 *
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <button onClick={() => setIsOpen(true)}>Open Modal</button>
 *
 * <AccessibleModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   description="Are you sure you want to proceed?"
 * >
 *   <p>Modal content goes here...</p>
 *   <ModalFooter>
 *     <button onClick={() => setIsOpen(false)}>Cancel</button>
 *     <button onClick={handleConfirm}>Confirm</button>
 *   </ModalFooter>
 * </AccessibleModal>
 */
