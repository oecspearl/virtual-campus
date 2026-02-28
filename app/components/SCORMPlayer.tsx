'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SCORMPlayerProps {
  packageUrl: string;
  scormPackageId: string;
  scormVersion: '1.2' | '2004';
  courseId?: string;
  lessonId?: string;
  title?: string;
}

// SCORM API Wrapper
class SCORMAPI {
  private apiEndpoint: string;
  private scormPackageId: string;
  private scormVersion: '1.2' | '2004';
  private courseId?: string;
  private lessonId?: string;
  private initialized: boolean = false;

  constructor(
    apiEndpoint: string,
    scormPackageId: string,
    scormVersion: '1.2' | '2004',
    courseId?: string,
    lessonId?: string
  ) {
    this.apiEndpoint = apiEndpoint;
    this.scormPackageId = scormPackageId;
    this.scormVersion = scormVersion;
    this.courseId = courseId;
    this.lessonId = lessonId;
  }

  public async callAPI(action: string, element?: string, value?: string): Promise<any> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          scormPackageId: this.scormPackageId,
          element,
          value,
          courseId: this.courseId,
          lessonId: this.lessonId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('SCORM API call error:', error);
      throw error;
    }
  }

  async LMSInitialize(param: string): Promise<string> {
    const result = await this.callAPI('Initialize');
    this.initialized = result.result === 'true';
    return this.initialized ? 'true' : 'false';
  }

  async LMSFinish(param: string): Promise<string> {
    if (!this.initialized) return 'false';
    const result = await this.callAPI('Terminate');
    this.initialized = false;
    return result.result === 'true' ? 'true' : 'false';
  }

  async LMSGetValue(element: string): Promise<string> {
    if (!this.initialized) {
      console.warn('SCORM API not initialized');
      return '';
    }
    const result = await this.callAPI('GetValue', element);
    return result.result || '';
  }

  async LMSSetValue(element: string, value: string): Promise<string> {
    if (!this.initialized) {
      console.warn('SCORM API not initialized');
      return 'false';
    }
    const result = await this.callAPI('SetValue', element, value);
    return result.result === 'true' ? 'true' : 'false';
  }

  async LMSCommit(param: string): Promise<string> {
    if (!this.initialized) return 'false';
    const result = await this.callAPI('Commit');
    return result.result === 'true' ? 'true' : 'false';
  }

  async LMSGetLastError(): Promise<number> {
    const result = await this.callAPI('GetLastError');
    return parseInt(result.result || '0', 10);
  }

  async LMSGetErrorString(errorCode: string): Promise<string> {
    const result = await this.callAPI('GetErrorString', undefined, undefined);
    return result.result || '';
  }

  async LMSGetDiagnostic(errorCode: string): Promise<string> {
    const result = await this.callAPI('GetDiagnostic');
    return result.result || '';
  }
}

export default function SCORMPlayer({
  packageUrl,
  scormPackageId,
  scormVersion,
  courseId,
  lessonId,
  title = 'SCORM Content'
}: SCORMPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const apiRef = useRef<SCORMAPI | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create SCORM API wrapper
    const api = new SCORMAPI(
      '/api/scorm/runtime',
      scormPackageId,
      scormVersion,
      courseId,
      lessonId
    );
    apiRef.current = api;

    // Expose SCORM API to iframe
    const exposeAPI = () => {
      if (!iframeRef.current?.contentWindow) return;

      const iframeWindow = iframeRef.current.contentWindow as any;
      
      // SCORM 1.2 API
      iframeWindow.API = {
        LMSInitialize: async (param: string) => {
          const result = await api.LMSInitialize(param);
          if (result === 'true') {
            setIsInitialized(true);
          }
          return result;
        },
        LMSFinish: (param: string) => api.LMSFinish(param),
        LMSGetValue: (element: string) => api.LMSGetValue(element),
        LMSSetValue: (element: string, value: string) => api.LMSSetValue(element, value),
        LMSCommit: (param: string) => api.LMSCommit(param),
        LMSGetLastError: () => api.LMSGetLastError(),
        LMSGetErrorString: (errorCode: string) => api.LMSGetErrorString(errorCode),
        LMSGetDiagnostic: (errorCode: string) => api.LMSGetDiagnostic(errorCode),
      };

      // SCORM 2004 API
      iframeWindow.API_1484_11 = {
        Initialize: async (param: string) => {
          const result = await api.LMSInitialize(param);
          if (result === 'true') {
            setIsInitialized(true);
          }
          return result;
        },
        Terminate: (param: string) => api.LMSFinish(param),
        GetValue: (element: string) => api.LMSGetValue(element),
        SetValue: (element: string, value: string) => api.LMSSetValue(element, value),
        Commit: (param: string) => api.LMSCommit(param),
        GetLastError: () => api.LMSGetLastError(),
        GetErrorString: (errorCode: string) => api.LMSGetErrorString(errorCode),
        GetDiagnostic: (errorCode: string) => api.LMSGetDiagnostic(errorCode),
      };

      // Auto-save interval (every 30 seconds)
      const autoSaveInterval = setInterval(() => {
        if (isInitialized && apiRef.current) {
          apiRef.current.LMSCommit('').catch(console.error);
        }
      }, 30000);

      // Cleanup on unmount
      return () => {
        clearInterval(autoSaveInterval);
        if (apiRef.current && isInitialized) {
          apiRef.current.callAPI('Terminate').catch(console.error);
        }
      };
    };

    // Wait for iframe to load
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = () => {
        setIsLoading(false);
        setTimeout(exposeAPI, 500); // Give iframe time to initialize
      };

      iframe.onerror = () => {
        setError('Failed to load SCORM content');
        setIsLoading(false);
      };
    }

    // Cleanup: Terminate SCORM session when component unmounts
    return () => {
      if (apiRef.current && isInitialized) {
        apiRef.current.LMSFinish('').catch(console.error);
      }
    };
  }, [scormPackageId, scormVersion, courseId, lessonId, isInitialized]);

  // Handle page unload - save progress
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (apiRef.current && isInitialized) {
        apiRef.current.LMSCommit('');
        apiRef.current.LMSFinish('');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isInitialized]);

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading SCORM Content</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading SCORM content...</p>
          </div>
        )}
        <div 
          className="relative w-full" 
          style={{ 
            minHeight: '600px',
            display: isLoading ? 'none' : 'block'
          }}
        >
          <iframe
            ref={iframeRef}
            src={packageUrl}
            title={title}
            className="w-full h-full border-0"
            style={{ minHeight: '600px' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="fullscreen"
            loading="lazy"
          />
        </div>
        {isInitialized && (
          <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 text-sm text-blue-700">
            SCORM session active • Progress is being saved automatically
          </div>
        )}
      </div>
    </div>
  );
}

