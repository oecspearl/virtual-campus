/**
 * Accessibility Utilities for OECS LearnBoard
 * 
 * Provides utilities for WCAG 2.1 AA compliance including:
 * - Focus management
 * - ARIA attribute helpers
 * - Keyboard navigation
 * - Screen reader announcements
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Focus management utilities
 */
export const FocusManager = {
    /**
     * Focus first focusable element in container
     */
    focusFirst(container: HTMLElement | null): void {
        if (!container) return;

        const focusable = this.getFocusableElements(container);
        if (focusable.length > 0) {
            (focusable[0] as HTMLElement).focus();
        }
    },

    /**
     * Focus last focusable element in container
     */
    focusLast(container: HTMLElement | null): void {
        if (!container) return;

        const focusable = this.getFocusableElements(container);
        if (focusable.length > 0) {
            (focusable[focusable.length - 1] as HTMLElement).focus();
        }
    },

    /**
     * Get all focusable elements in container
     */
    getFocusableElements(container: HTMLElement): Element[] {
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'textarea:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ].join(',');

        return Array.from(container.querySelectorAll(selector));
    },

    /**
     * Trap focus within container (for modals)
     */
    trapFocus(container: HTMLElement | null, event: KeyboardEvent): void {
        if (!container || event.key !== 'Tab') return;

        const focusable = this.getFocusableElements(container);
        if (focusable.length === 0) return;

        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    },
};

/**
 * Hook for focus trap (use in modals)
 */
export function useFocusTrap(isActive: boolean = true) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;

        // Focus first element when activated
        FocusManager.focusFirst(container);

        // Handle keyboard events
        const handleKeyDown = (event: KeyboardEvent) => {
            FocusManager.trapFocus(container, event);
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActive]);

    return containerRef;
}

/**
 * Hook for managing focus on mount
 */
export function useAutoFocus(shouldFocus: boolean = true) {
    const elementRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (shouldFocus && elementRef.current) {
            elementRef.current.focus();
        }
    }, [shouldFocus]);

    return elementRef;
}

/**
 * ARIA attribute helpers
 */
export const AriaHelpers = {
    /**
     * Generate ARIA props for expandable sections
     */
    expandable(id: string, isExpanded: boolean) {
        return {
            'aria-expanded': isExpanded,
            'aria-controls': id,
        };
    },

    /**
     * Generate ARIA props for tabs
     */
    tab(id: string, isSelected: boolean, controls: string) {
        return {
            role: 'tab',
            id,
            'aria-selected': isSelected,
            'aria-controls': controls,
            tabIndex: isSelected ? 0 : -1,
        };
    },

    /**
     * Generate ARIA props for tab panels
     */
    tabPanel(id: string, labelledBy: string, isHidden: boolean) {
        return {
            role: 'tabpanel',
            id,
            'aria-labelledby': labelledBy,
            hidden: isHidden,
            tabIndex: 0,
        };
    },

    /**
     * Generate ARIA props for modals
     */
    modal(id: string, labelId: string, descriptionId?: string) {
        return {
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': labelId,
            'aria-describedby': descriptionId,
        };
    },

    /**
     * Generate ARIA props for alerts
     */
    alert(type: 'error' | 'warning' | 'info' | 'success' = 'info') {
        return {
            role: type === 'error' ? 'alert' : 'status',
            'aria-live': type === 'error' ? 'assertive' : 'polite',
            'aria-atomic': true,
        };
    },
};

/**
 * Screen reader announcement utilities
 */
export class ScreenReaderAnnouncer {
    private static instance: ScreenReaderAnnouncer;
    private container: HTMLDivElement | null = null;

    private constructor() {
        if (typeof window !== 'undefined') {
            this.createContainer();
        }
    }

    static getInstance(): ScreenReaderAnnouncer {
        if (!ScreenReaderAnnouncer.instance) {
            ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
        }
        return ScreenReaderAnnouncer.instance;
    }

    private createContainer(): void {
        this.container = document.createElement('div');
        this.container.setAttribute('role', 'status');
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        this.container.className = 'sr-only';
        document.body.appendChild(this.container);
    }

    announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        if (!this.container) return;

        this.container.setAttribute('aria-live', priority);
        this.container.textContent = message;

        // Clear after announcement
        setTimeout(() => {
            if (this.container) {
                this.container.textContent = '';
            }
        }, 1000);
    }
}

/**
 * Hook for screen reader announcements
 */
export function useAnnounce() {
    const announcer = ScreenReaderAnnouncer.getInstance();

    return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        announcer.announce(message, priority);
    }, [announcer]);
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardNav = {
    /**
     * Handle arrow key navigation in lists
     */
    handleArrowKeys(
        event: React.KeyboardEvent,
        currentIndex: number,
        totalItems: number,
        onNavigate: (index: number) => void
    ): void {
        let newIndex = currentIndex;

        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                event.preventDefault();
                newIndex = (currentIndex + 1) % totalItems;
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                event.preventDefault();
                newIndex = (currentIndex - 1 + totalItems) % totalItems;
                break;
            case 'Home':
                event.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                newIndex = totalItems - 1;
                break;
            default:
                return;
        }

        onNavigate(newIndex);
    },

    /**
     * Check if key is an action key (Enter or Space)
     */
    isActionKey(event: React.KeyboardEvent): boolean {
        return event.key === 'Enter' || event.key === ' ';
    },

    /**
     * Check if key is Escape
     */
    isEscapeKey(event: React.KeyboardEvent): boolean {
        return event.key === 'Escape';
    },
};

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcut(
    key: string,
    callback: () => void,
    options: {
        ctrl?: boolean;
        shift?: boolean;
        alt?: boolean;
        enabled?: boolean;
    } = {}
) {
    const { ctrl = false, shift = false, alt = false, enabled = true } = options;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const matchesKey = event.key.toLowerCase() === key.toLowerCase();
            const matchesCtrl = ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
            const matchesShift = shift ? event.shiftKey : !event.shiftKey;
            const matchesAlt = alt ? event.altKey : !event.altKey;

            if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
                event.preventDefault();
                callback();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [key, ctrl, shift, alt, enabled, callback]);
}

/**
 * Color contrast utilities
 */
export const ColorContrast = {
    /**
     * Calculate relative luminance
     */
    getLuminance(hex: string): number {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return 0;

        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
            val = val / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },

    /**
     * Calculate contrast ratio between two colors
     */
    getContrastRatio(hex1: string, hex2: string): number {
        const lum1 = this.getLuminance(hex1);
        const lum2 = this.getLuminance(hex2);
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);

        return (lighter + 0.05) / (darker + 0.05);
    },

    /**
     * Check if contrast ratio meets WCAG AA standard
     */
    meetsWCAG_AA(hex1: string, hex2: string, isLargeText: boolean = false): boolean {
        const ratio = this.getContrastRatio(hex1, hex2);
        return isLargeText ? ratio >= 3 : ratio >= 4.5;
    },

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : null;
    },
};

/**
 * Accessible form helpers
 */
export const FormHelpers = {
    /**
     * Generate accessible form field props
     */
    field(id: string, label: string, error?: string, required: boolean = false) {
        return {
            id,
            'aria-label': label,
            'aria-required': required,
            'aria-invalid': !!error,
            'aria-describedby': error ? `${id}-error` : undefined,
        };
    },

    /**
     * Generate error message props
     */
    error(fieldId: string) {
        return {
            id: `${fieldId}-error`,
            role: 'alert',
            'aria-live': 'polite',
        };
    },
};

/**
 * Export singleton announcer
 */
export const announcer = ScreenReaderAnnouncer.getInstance();
