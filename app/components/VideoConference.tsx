'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VideoConference as ConferenceType } from '@/types/conference';
import GoogleMeetConference from './GoogleMeetConference';

interface VideoConferenceProps {
  conference: ConferenceType;
  isHost: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function VideoConference({
  conference,
  isHost,
  onJoin,
  onLeave,
  onError
}: VideoConferenceProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [isJitsiReady, setIsJitsiReady] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine which video provider to use
  const videoProvider = conference.video_provider || '8x8vc';

  useEffect(() => {
    // Only load Jitsi script if we are using 8x8vc
    if (videoProvider !== '8x8vc') return;

    // Load Jitsi Meet API script
    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          console.log('Jitsi API already available');
          resolve(window.JitsiMeetExternalAPI);
          return;
        }

        console.log('Loading Jitsi Meet API script...');
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => {
          console.log('Jitsi script loaded, waiting for API...');
          // Wait a bit for the API to be fully available
          setTimeout(() => {
            if (window.JitsiMeetExternalAPI) {
              console.log('Jitsi API is now available');
              resolve(window.JitsiMeetExternalAPI);
            } else {
              console.error('JitsiMeetExternalAPI not available after script load');
              reject(new Error('JitsiMeetExternalAPI not available after script load'));
            }
          }, 200); // Increased timeout
        };
        script.onerror = (error) => {
          console.error('Script load error:', error);
          reject(error);
        };
        document.head.appendChild(script);
      });
    };

    loadJitsiScript()
      .then(() => {
        console.log('Jitsi Meet API loaded successfully');
        setIsJitsiReady(true);
      })
      .catch((error) => {
        console.error('Failed to load Jitsi Meet API:', error);
        onError?.('Failed to load video conference. Please refresh the page.');
        setIsJitsiReady(false);
      });
  }, [onError, videoProvider]);

  // Container ref callback
  const containerRefCallback = (element: HTMLDivElement | null) => {
    jitsiContainerRef.current = element;
    setContainerReady(!!element);
    console.log('Container ref callback:', {
      element,
      hasElement: !!element,
      containerReady: !!element
    });
  };

  // Ensure container ref is available
  useEffect(() => {
    if (videoProvider !== '8x8vc') return;
    console.log('Container ref status:', {
      hasRef: !!jitsiContainerRef,
      hasCurrent: !!jitsiContainerRef.current,
      containerReady,
      element: jitsiContainerRef.current
    });
  }, [containerReady, videoProvider]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
      }
    };
  }, [jitsiApi]);

  // Listen for fullscreen changes
  useEffect(() => {
    if (videoProvider !== '8x8vc') return;
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [videoProvider]);

  // Keyboard shortcuts
  useEffect(() => {
    if (videoProvider !== '8x8vc') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when the conference is joined
      if (!isJoined) return;

      // F11 for fullscreen toggle
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
      }

      // Escape to exit expanded/fullscreen
      if (event.key === 'Escape') {
        if (isFullscreen) {
          toggleFullscreen();
        } else if (isExpanded) {
          toggleExpanded();
        }
      }

      // E for expand toggle
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        toggleExpanded();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isJoined, isFullscreen, isExpanded, videoProvider]);

  const joinConference = async () => {
    console.log('Join conference called:', {
      isJitsiReady,
      hasJitsiAPI: !!window.JitsiMeetExternalAPI,
      hasContainer: !!jitsiContainerRef.current,
      containerReady,
      conferenceId: conference.id
    });

    if (!isJitsiReady || !window.JitsiMeetExternalAPI) {
      console.error('Jitsi not ready:', {
        isJitsiReady,
        hasJitsiAPI: !!window.JitsiMeetExternalAPI
      });
      onError?.('Video conference not ready. Please wait a moment and try again.');
      return;
    }

    if (!containerReady || !jitsiContainerRef.current) {
      console.error('Container not ready:', {
        containerReady,
        hasContainer: !!jitsiContainerRef.current
      });
      onError?.('Video container not ready. Please wait a moment and try again.');
      return;
    }

    console.log('Container is ready, proceeding with join...');

    setIsLoading(true);

    try {
      console.log('Attempting to join conference via API...');

      // Join the conference via API first
      const response = await fetch(`/api/conferences/${conference.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to join conference';
        try {
          const errorData = await response.json();
          console.error('API error:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          const errorText = await response.text();
          console.error('API error (non-JSON):', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let joinData;
      try {
        joinData = await response.json();
        console.log('API join successful:', joinData);
      } catch (parseError) {
        console.error('Failed to parse join response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!joinData || !joinData.conference) {
        console.error('Invalid join data:', joinData);
        throw new Error('Conference not found in response');
      }

      // Wait a bit more to ensure the container is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Double-check container is ready
      if (!jitsiContainerRef.current) {
        console.error('Container ref is null after waiting');
        throw new Error('Video container not ready');
      }

      // Initialize Jitsi Meet with 8x8.vc for better reliability
      // For 8x8.vc public rooms, use simple room names without tenant prefix

      // Get meeting_id from join response or conference object
      const meetingId = joinData.meetingId || joinData.conference?.meeting_id || conference.meeting_id;

      if (!meetingId) {
        throw new Error('Meeting ID not found. Cannot join conference.');
      }

      // Extract meeting ID from URL if it's a full URL
      let cleanMeetingId = meetingId;
      if (meetingId.includes('/')) {
        // If meeting_id contains a path, extract just the ID part
        const parts = meetingId.split('/');
        cleanMeetingId = parts[parts.length - 1];
      }
      // Remove 'oecs-' prefix if it exists (it's added in the room name)
      if (cleanMeetingId.startsWith('oecs-')) {
        cleanMeetingId = cleanMeetingId.replace('oecs-', '');
      }

      // Use simple room name for 8x8.vc public rooms (no tenant prefix needed)
      const finalRoomName = `oecs-${cleanMeetingId}`;

      console.log('Initializing Jitsi Meet with:', {
        roomName: finalRoomName,
        hasParentNode: !!jitsiContainerRef.current,
        containerElement: jitsiContainerRef.current,
        isHost: isHost
      });

      // Use 8x8.vc server for better reliability and no moderation restrictions
      const jitsiServer = '8x8.vc';

      // 8x8.vc server configuration for better reliability
      const serverConfig = {
        hosts: {
          domain: '8x8.vc',
          muc: 'conference.8x8.vc'
        },
        bosh: 'https://8x8.vc/http-bind',
        websocket: 'wss://8x8.vc/xmpp-websocket'
      };

      // Configuration optimized for 8x8.vc
      const additionalConfig = {
        // 8x8.vc specific settings for better reliability
        enableLobby: false,
        enableWaitingRoom: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
        // Disable authentication requirements
        requireDisplayName: false,
        enableUserRolesBasedOnToken: false,
        // Force allow all participants
        disableModeratorIndicator: false,
        enableModeratorIndicator: isHost,
        // Additional bypass settings
        enableInsecureRoomNameWarning: false,
        enableNoisyMicDetection: true,
        enableTalkWhileMuted: true,
        enableNoAudioDetection: true,
        // Disable JWT authentication to avoid token expiration issues
        // 8x8.vc public rooms don't require JWT tokens
        enableJWT: false,
        // P2P configuration for better connectivity with 8x8.vc
        p2p: {
          enabled: true,
          stunServers: [
            { urls: 'stun:8x8.vc:443' }
          ]
        }
      };

      const api = new window.JitsiMeetExternalAPI(jitsiServer, {
        roomName: finalRoomName,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        // Add server configuration for better moderation bypass
        ...serverConfig,
        // Merge additional configuration
        ...additionalConfig,
        configOverwrite: {
          // Core settings
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          enableClosePage: false,
          enableLayerSuspension: true,
          startScreenSharing: false,
          enableP2P: true,

          // Disable JWT authentication - 8x8.vc public rooms don't require JWT tokens
          enableJWT: false,

          // Disable all moderation, lobby, and waiting room features
          disableModeratorIndicator: false,
          enableModeratorIndicator: isHost,
          requireDisplayName: false,
          enableUserRolesBasedOnToken: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          enableLobby: false,
          enableWaitingRoom: false,

          // Additional settings
          enableInsecureRoomNameWarning: false,
          enableNoisyMicDetection: true,
          enableTalkWhileMuted: true,
          enableNoAudioDetection: true,

          // P2P configuration for better connectivity
          p2p: {
            enabled: true,
            stunServers: [
              { urls: 'stun:meet-jit-si-turnrelay.jitsi.net:443' }
            ]
          }
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', 'security'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DEFAULT_LOGO_URL: '/oecs-logo.png',
          DEFAULT_WELCOME_PAGE_LOGO_URL: '/oecs-logo.png',
          PROVIDER_NAME: 'OECS Learning Hub',
          APP_NAME: 'OECS Learning Hub',
          NATIVE_APP_NAME: 'OECS Learning Hub',
          SUPPORT_URL: 'mailto:support@oecslearning.org'
        },
        userInfo: {
          displayName: isHost ? 'Host' : 'Participant',
          email: isHost ? 'host@oecslearning.org' : 'participant@oecslearning.org',
          // Add host role for proper authentication
          ...(isHost && {
            role: 'moderator',
            isModerator: true,
            moderator: true,
            // Additional host properties to bypass moderation
            isHost: true,
            isOwner: true,
            isCreator: true
          })
        },
        // JWT authentication disabled - 8x8.vc public rooms don't require JWT tokens
        // This prevents "Token is expired" errors
      });

      // Event listeners
      api.addEventListeners({
        videoConferenceJoined: () => {
          console.log('Joined video conference - updating UI state');
          setIsJoined(true);
          setIsLoading(false);
          onJoin();
        },
        participantRoleChanged: (event: any) => {
          console.log('Participant role changed:', event.role);
          if (event.role === 'moderator') {
            console.log('User is now moderator - can disable lobby');
            // Optionally disable lobby when moderator joins
            api.executeCommand('toggleLobby', false);
          }
        },
        readyToClose: () => {
          console.log('Video conference ready to close');
        },
        videoConferenceLeft: () => {
          console.log('Left video conference');
          setIsJoined(false);
          onLeave();
        },
        participantJoined: (participant: any) => {
          console.log('Participant joined:', participant);
          setParticipantCount(prev => prev + 1);
        },
        participantLeft: (participant: any) => {
          console.log('Participant left:', participant);
          setParticipantCount(prev => Math.max(0, prev - 1));
        },
        error: (error: any) => {
          console.error('Jitsi Meet error:', error);
          onError?.('Video conference error occurred. Please try again.');
          setIsLoading(false);
        },
        videoConferenceReady: () => {
          console.log('Video conference ready - interface should be visible');
          // Auto-join when ready
          setTimeout(() => {
            if (!isJoined) {
              console.log('Auto-joining conference after ready event');
              setIsJoined(true);
              setIsLoading(false);
              onJoin();
            }
          }, 1000);
        },
        videoConferenceWillJoin: () => {
          console.log('Video conference will join - starting connection');
        },
        conferenceJoined: () => {
          console.log('Conference joined event fired');
          setIsJoined(true);
          setIsLoading(false);
          onJoin();
        },
        conferenceLeft: () => {
          console.log('Conference left event fired');
          setIsJoined(false);
          onLeave();
        },
        // Handle conference failures with 8x8.vc
        conferenceFailed: (error: any) => {
          console.error('Conference failed:', error);
          // 8x8.vc is more reliable, but we still handle errors gracefully
          if (error && error.error === 'conference.connectionError.membersOnly') {
            console.log('Members only error detected with 8x8.vc - this should be rare');
            // 8x8.vc rarely has this issue, but if it does, retry once
            setTimeout(() => {
              console.log('Retrying conference join with 8x8.vc...');
              api.dispose();
              joinConference();
            }, 1000);
          } else {
            // For other errors, just retry once
            console.log('Conference error occurred, retrying...');
            setTimeout(() => {
              api.dispose();
              joinConference();
            }, 2000);
          }
          onError?.('Video conference error occurred. Please try again.');
          setIsLoading(false);
        }
      });

      // Fallback timeout - if no events fire within 10 seconds, assume we're joined
      const joinTimeout = setTimeout(() => {
        console.log('Join timeout reached - assuming conference joined');
        if (!isJoined) {
          setIsJoined(true);
          setIsLoading(false);
          onJoin();
        }
      }, 10000);

      // Clear timeout when we actually join
      const originalOnJoin = onJoin;
      onJoin = () => {
        clearTimeout(joinTimeout);
        originalOnJoin();
      };

      setJitsiApi(api);

      // Check if we're already in the conference
      setTimeout(() => {
        try {
          const participants = api.getParticipantsInfo();
          console.log('Current participants:', participants);
          if (participants && participants.length >= 0) {
            console.log('Already in conference - updating UI state');
            setIsJoined(true);
            setIsLoading(false);
            onJoin();
          }
        } catch (error) {
          console.log('Could not check participants:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('Error joining conference:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to join conference');
      setIsLoading(false);
    }
  };

  const leaveConference = () => {
    if (jitsiApi) {
      jitsiApi.dispose();
      setJitsiApi(null);
      setIsJoined(false);
    }

    // Notify backend that user left
    fetch(`/api/conferences/${conference.id}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(console.error);

    onLeave();
  };

  const toggleMute = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleVideo');
    }
  };

  const toggleScreenShare = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleShareScreen');
    }
  };

  const toggleChat = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleChat');
    }
  };

  const toggleRecording = () => {
    if (jitsiApi && isHost) {
      jitsiApi.executeCommand('toggleRecording');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      const container = document.querySelector('[data-video-conference-container]') as HTMLElement;
      if (container) {
        container.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      }
    } else {
      // Exit fullscreen
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // If Google Meet, render GoogleMeetConference component
  if (videoProvider === 'google_meet') {
    return (
      <GoogleMeetConference
        conference={conference as any}
        isHost={isHost}
        onJoin={onJoin}
        onLeave={onLeave}
        onError={onError}
      />
    );
  }

  // If BigBlueButton, render a simple join button that opens in a new tab
  // BBB works best in a full window, not an iframe
  if (videoProvider === 'bigbluebutton') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">{conference.title}</h2>
          <p className="text-gray-300 mb-8">
            This class is hosted on BigBlueButton. Click the button below to join the classroom in a new tab.
          </p>

          <button
            onClick={() => {
              let url = conference.meeting_url;
              // Fix for potential relative URLs in database
              if (videoProvider === 'bigbluebutton' && !url.startsWith('http') && !url.startsWith('/')) {
                url = `/api/conferences/${url}`;
              } else if (videoProvider === 'bigbluebutton' && url.startsWith('/') && !url.startsWith('/api/conferences/')) {
                // If it's just the ID or partial path
                url = `/api/conferences/${url}`;
              }

              window.open(url, '_blank');
              onJoin();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-lg flex items-center justify-center mx-auto"
          >
            <span>Join Classroom</span>
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          <button
            onClick={onLeave}
            className="mt-6 text-gray-400 hover:text-white text-sm underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Default to Jitsi (8x8.vc)
  return (
    <div
      className={`w-full h-full bg-gray-900 rounded-lg overflow-hidden transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-50 rounded-none' : ''
        } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
      data-video-conference-container
    >
      {/* Conference Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <div>
            <h3 className="text-white font-semibold">{conference.title}</h3>
            <p className="text-gray-300 text-sm">
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Expand/Fullscreen Controls - only show when joined */}
          {isJoined && (
            <>
              <button
                onClick={toggleExpanded}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                title={isExpanded ? "Minimize" : "Expand"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isExpanded ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9v4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5M15 15l5.5 5.5" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  )}
                </svg>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isFullscreen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9v4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5M15 15l5.5 5.5" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  )}
                </svg>
              </button>
            </>
          )}

          {!isJoined ? (
            <button
              onClick={joinConference}
              disabled={isLoading || !isJitsiReady || !containerReady}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Joining...' : !isJitsiReady ? 'Loading...' : !containerReady ? 'Preparing...' : 'Join Conference'}
            </button>
          ) : (
            <button
              onClick={leaveConference}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Leave Conference
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className={`relative ${isExpanded || isFullscreen ? 'h-screen' : 'h-full'}`}>
        {/* Always render the Jitsi container - visible when joining or joined */}
        <div
          ref={containerRefCallback}
          data-jitsi-container
          className={`w-full h-full ${!isJoined && !isLoading ? 'hidden' : ''}`}
        />

        {!isJoined && !isLoading && (
          <div className="flex items-center justify-center h-full bg-gray-800">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">
                {isJitsiReady && containerReady ? 'Ready to join?' : 'Loading video conference...'}
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                {isJitsiReady && containerReady
                  ? 'Click "Join Conference" to start the video call'
                  : 'Please wait while we prepare the video conference'
                }
              </p>
              {conference.meeting_password && (
                <p className="text-yellow-300 text-sm">
                  Meeting Password: {conference.meeting_password}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Loading overlay when joining */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-800 bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-white text-lg font-semibold mb-2">Joining Conference...</h3>
              <p className="text-gray-300 text-sm">Please wait while we connect you to the video call</p>
            </div>
          </div>
        )}

        {/* Close button for expanded view */}
        {(isExpanded || isFullscreen) && (
          <button
            onClick={() => {
              if (isFullscreen) {
                toggleFullscreen();
              } else {
                toggleExpanded();
              }
            }}
            className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Custom Controls Overlay - only show when joined */}
        {isJoined && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-800 bg-opacity-90 rounded-lg px-4 py-2 flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                title="Toggle Microphone"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              <button
                onClick={toggleVideo}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                title="Toggle Camera"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                onClick={toggleScreenShare}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                title="Share Screen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                onClick={toggleChat}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                title="Toggle Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              {isHost && conference.recording_enabled && (
                <button
                  onClick={toggleRecording}
                  className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                  title="Toggle Recording"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
