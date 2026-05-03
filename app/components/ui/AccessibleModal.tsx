'use client';

import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap, useAnnounce } from '@/lib/accessibility-utils';

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

  // The element that held focus when the modal opened — captured inside
  // the open-effect so parent re-renders while the modal is open don't
  // overwrite it (an earlier version reassigned triggerRef on every render,
  // which made the effect re-run per keystroke and briefly steal focus
  // from inputs inside the dialog).
  const triggerRef = useRef<HTMLElement | null>(null);

  // Keep the latest callbacks/flags in refs so the open-effect only has
  // to depend on `isOpen`. Otherwise parents passing inline arrow props
  // (onClose={() => setOpen(false)}) cause the effect to tear down and
  // rebuild on every render.
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { closeOnEscapeRef.current = closeOnEscape; }, [closeOnEscape]);

  // Stable unique IDs for ARIA
  const reactId = useId();
  const titleId = `modal-title-${reactId}`;
  const descriptionId = description ? `modal-desc-${reactId}` : undefined;

  // Set up event listeners and body scroll lock — runs once per open/close.
  useEffect(() => {
    if (!isOpen) return;

    // Capture focus origin on open.
    triggerRef.current =
      typeof document !== 'undefined'
        ? (document.activeElement as HTMLElement | null)
        : null;

    announce(`${title} dialog opened`, 'polite');

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscapeRef.current && event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);

      const trigger = triggerRef.current;
      if (trigger && typeof trigger.focus === 'function') {
        setTimeout(() => trigger.focus(), 0);
      }

      announce('Dialog closed', 'polite');
    };
  }, [isOpen, title, announce]);

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
      className="fixed inset-0 z-[60] overflow-hidden"
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/*
        Modal container.
        - Mobile (< sm): bottom-sheet — panel pinned to viewport bottom,
          full-width, rounded top corners, capped at 85vh with internal scroll.
        - sm and up: centered card with size-specific max-width.
      */}
      <div
        className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4"
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
            bg-white shadow-xl
            flex flex-col
            max-h-[85vh] sm:max-h-[calc(100vh-2rem)]
            rounded-t-2xl sm:rounded-lg
            transform transition-all
            ${className}
          `}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Drag handle (mobile bottom-sheet affordance) */}
          <div
            className="flex justify-center pt-2 pb-1 sm:hidden"
            aria-hidden="true"
          >
            <span className="block h-1 w-9 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-200 flex-shrink-0">
            <div className="min-w-0 flex-1">
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
                className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 -mt-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg"
                style={{ '--tw-ring-color': 'var(--theme-primary)' } as React.CSSProperties}
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content (scrolls when panel is capped) */}
          <div
            className="p-4 overflow-y-auto flex-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
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
