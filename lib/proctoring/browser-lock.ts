/**
 * Browser Locking Functionality
 * Prevents cheating during online exams by locking the browser
 */

export interface BrowserLockConfig {
  preventCopyPaste: boolean;
  preventNewTabs: boolean;
  preventPrinting: boolean;
  preventScreenCapture: boolean;
  requireFullscreen: boolean;
  allowSwitchingTabs: boolean;
  maxTabSwitches: number;
  onViolation?: (violation: BrowserViolation) => void;
}

export interface BrowserViolation {
  type: 'copy_paste' | 'new_tab' | 'print' | 'screen_capture' | 'fullscreen_exit' | 'tab_switch' | 'devtools';
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export class BrowserLock {
  private config: BrowserLockConfig;
  private tabSwitchCount: number = 0;
  private isActive: boolean = false;
  private violationCallbacks: ((violation: BrowserViolation) => void)[] = [];

  constructor(config: BrowserLockConfig) {
    this.config = config;
    if (config.onViolation) {
      this.violationCallbacks.push(config.onViolation);
    }
  }

  /**
   * Start browser locking
   */
  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.tabSwitchCount = 0;

    // Prevent copy/paste
    if (this.config.preventCopyPaste) {
      this.preventCopyPaste();
    }

    // Prevent new tabs/windows
    if (this.config.preventNewTabs) {
      this.preventNewTabs();
    }

    // Prevent printing
    if (this.config.preventPrinting) {
      this.preventPrinting();
    }

    // Prevent screen capture (limited effectiveness)
    if (this.config.preventScreenCapture) {
      this.preventScreenCapture();
    }

    // Require fullscreen
    if (this.config.requireFullscreen) {
      this.requireFullscreen();
    }

    // Monitor tab switches
    if (!this.config.allowSwitchingTabs) {
      this.monitorTabSwitches();
    }

    // Monitor dev tools
    this.monitorDevTools();

    // Prevent context menu
    document.addEventListener('contextmenu', this.handleContextMenu);
    
    // Prevent keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Stop browser locking
   */
  stop(): void {
    this.isActive = false;
    // Remove all event listeners
    document.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  private preventCopyPaste(): void {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      this.recordViolation({
        type: 'copy_paste',
        timestamp: new Date(),
        severity: 'medium',
        metadata: { action: 'copy' }
      });
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      this.recordViolation({
        type: 'copy_paste',
        timestamp: new Date(),
        severity: 'medium',
        metadata: { action: 'paste' }
      });
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      this.recordViolation({
        type: 'copy_paste',
        timestamp: new Date(),
        severity: 'medium',
        metadata: { action: 'cut' }
      });
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
  }

  private preventNewTabs(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T, Ctrl+N, Ctrl+W, Ctrl+Shift+T
      if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'n' || e.key === 'w' || (e.shiftKey && e.key === 'T'))) {
        e.preventDefault();
        this.recordViolation({
          type: 'new_tab',
          timestamp: new Date(),
          severity: 'high',
          metadata: { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey }
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
  }

  private preventPrinting(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        this.recordViolation({
          type: 'print',
          timestamp: new Date(),
          severity: 'medium',
          metadata: { key: e.key }
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Also prevent print dialog via window.print
    (window as any).print = () => {
      this.recordViolation({
        type: 'print',
        timestamp: new Date(),
        severity: 'medium',
        metadata: { method: 'window.print' }
      });
    };
  }

  private preventScreenCapture(): void {
    // Limited effectiveness - browsers don't allow full prevention
    // But we can detect some attempts
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.recordViolation({
          type: 'screen_capture',
          timestamp: new Date(),
          severity: 'high',
          metadata: { reason: 'page_hidden' }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  private requireFullscreen(): void {
    const checkFullscreen = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).mozFullScreenElement) {
        this.recordViolation({
          type: 'fullscreen_exit',
          timestamp: new Date(),
          severity: 'high',
          metadata: {}
        });
        
        // Try to re-enter fullscreen
        this.requestFullscreen();
      }
    };

    this.requestFullscreen();
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
  }

  private requestFullscreen(): void {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {
        // User denied or error
      });
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).mozRequestFullScreen) {
      (elem as any).mozRequestFullScreen();
    }
  }

  private monitorTabSwitches(): void {
    this.handleBlur = () => {
      this.tabSwitchCount++;
      
      if (this.tabSwitchCount > this.config.maxTabSwitches) {
        this.recordViolation({
          type: 'tab_switch',
          timestamp: new Date(),
          severity: 'high',
          metadata: { count: this.tabSwitchCount }
        });
      } else {
        this.recordViolation({
          type: 'tab_switch',
          timestamp: new Date(),
          severity: 'medium',
          metadata: { count: this.tabSwitchCount }
        });
      }
    };

    window.addEventListener('blur', this.handleBlur);
    
    // Prevent leaving page
    this.handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  private monitorDevTools(): void {
    let devToolsOpen = false;
    
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          this.recordViolation({
            type: 'devtools',
            timestamp: new Date(),
            severity: 'critical',
            metadata: {}
          });
        }
      } else {
        devToolsOpen = false;
      }
    };

    setInterval(checkDevTools, 500);
  }

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    this.recordViolation({
      type: 'copy_paste',
      timestamp: new Date(),
      severity: 'low',
      metadata: { action: 'context_menu' }
    });
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
      ((e.ctrlKey || e.metaKey) && e.key === 'u')
    ) {
      e.preventDefault();
      this.recordViolation({
        type: 'devtools',
        timestamp: new Date(),
        severity: 'critical',
        metadata: { key: e.key }
      });
    }
  };

  private handleBlur: () => void;
  private handleBeforeUnload: (e: BeforeUnloadEvent) => void;

  private recordViolation(violation: BrowserViolation): void {
    this.violationCallbacks.forEach(callback => callback(violation));
  }

  /**
   * Add violation callback
   */
  onViolation(callback: (violation: BrowserViolation) => void): void {
    this.violationCallbacks.push(callback);
  }

  /**
   * Remove violation callback
   */
  offViolation(callback: (violation: BrowserViolation) => void): void {
    this.violationCallbacks = this.violationCallbacks.filter(cb => cb !== callback);
  }
}

/**
 * Create a browser lock instance
 */
export function createBrowserLock(config: BrowserLockConfig): BrowserLock {
  return new BrowserLock(config);
}

