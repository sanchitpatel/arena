/**
 * MediaGuard: Comprehensive Audio/Video Track Lifecycle Guard
 * 
 * Guarantees that:
 * 1. Every MediaStream (camera/microphone) acquired anywhere in Arena is registered.
 * 2. Unmounting components, toggling permissions OFF, or closing modals immediately 
 *    calls track.stop() on all tracks, instantly turning off camera/mic hardware LEDs.
 */

// Global registry of all active media streams in the browser session
if (typeof window !== 'undefined' && !window.__arenaActiveMediaStreams) {
  window.__arenaActiveMediaStreams = new Set();

  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const rawGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async function (constraints) {
      try {
        const stream = await rawGetUserMedia(constraints);
        if (stream) {
          window.__arenaActiveMediaStreams.add(stream);

          // Clean up registry when tracks end naturally
          stream.getTracks().forEach((track) => {
            track.addEventListener('ended', () => {
              const allEnded = stream.getTracks().every((t) => t.readyState === 'ended');
              if (allEnded) {
                window.__arenaActiveMediaStreams.delete(stream);
              }
            });
          });
        }
        return stream;
      } catch (err) {
        throw err;
      }
    };
  }
}

/**
 * Forcefully stops active media tracks (camera and/or microphone).
 * Ensures physical camera/mic sensor indicators turn off immediately.
 * 
 * @param {string} reason Description of why media tracks are being killed
 * @param {'video'|'audio'|null} kindFilter Optional: 'video' (camera only), 'audio' (mic only), or null/omitted (both)
 * @returns {number} The count of tracks that were stopped
 */
export function killAllMediaTracks(reason = 'Manual Shutdown', kindFilter = null) {
  let stoppedCount = 0;

  // 1. Terminate matching streams in the global registry
  if (typeof window !== 'undefined' && window.__arenaActiveMediaStreams) {
    window.__arenaActiveMediaStreams.forEach((stream) => {
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => {
          if (!kindFilter || track.kind === kindFilter) {
            try {
              if (track.readyState !== 'ended') {
                track.stop();
                stoppedCount++;
              }
            } catch { }
          }
        });

        // If all tracks in this stream are stopped, remove stream from registry
        if (stream.getTracks().every((t) => t.readyState === 'ended')) {
          window.__arenaActiveMediaStreams.delete(stream);
        }
      }
    });
  }

  // 2. Terminate matching tracks attached to <video> or <audio> DOM elements
  if (typeof document !== 'undefined') {
    const selector = kindFilter === 'video' ? 'video' : kindFilter === 'audio' ? 'audio' : 'video, audio';
    const mediaElements = document.querySelectorAll(selector);
    mediaElements.forEach((el) => {
      if (el && el.srcObject && typeof el.srcObject.getTracks === 'function') {
        el.srcObject.getTracks().forEach((track) => {
          if (!kindFilter || track.kind === kindFilter) {
            try {
              if (track.readyState !== 'ended') {
                track.stop();
                stoppedCount++;
              }
            } catch { }
          }
        });
        if (!kindFilter || el.tagName.toLowerCase() === kindFilter) {
          el.srcObject = null;
        }
      }
    });
  }

  return stoppedCount;
}

/**
 * Checks the current permission state for a device capability (camera or microphone).
 * Compares in-app user preference (localStorage) against native browser query.
 * 
 * @param {'camera'|'microphone'} type 
 * @returns {Promise<{ localPref: string|null, browserState: string, isAllowed: boolean }>}
 */
export async function queryPermissionStatus(type) {
  const prefKey = type === 'camera' ? 'arena_perm_camera' : 'arena_perm_mic';
  const localPref = typeof window !== 'undefined' ? window.localStorage.getItem(prefKey) : null;
  let browserState = 'unknown';

  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    try {
      const res = await navigator.permissions.query({ name: type });
      browserState = res.state; // 'granted' | 'prompt' | 'denied'
    } catch {
      browserState = 'unsupported';
    }
  }

  // In-app explicit disable strictly takes precedence, AND browser 'denied' cannot be overridden
  const isAllowed =
    localPref !== 'disabled' &&
    browserState !== 'denied' &&
    (browserState === 'granted' || localPref === 'granted');

  // Self-heal stale localStorage if the user revoked permission in browser settings
  if (browserState === 'denied' && localPref === 'granted' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(prefKey, 'denied');
    } catch { }
  }

  return { localPref, browserState, isAllowed };
}

export const ARENA_PERM_EVENT = 'arena_permission_changed';

/**
 * Persists an in-app permission setting and broadcasts the change across all components
 * in the active window (so Profile and QR Scanner stay 100% in sync in real time).
 * 
 * @param {'camera'|'mic'} capability
 * @param {'granted'|'disabled'|'denied'} state
 */
export function setInAppPermission(capability, state) {
  const prefKey = capability === 'camera' ? 'arena_perm_camera' : 'arena_perm_mic';
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(prefKey, state);
      window.dispatchEvent(
        new CustomEvent(ARENA_PERM_EVENT, {
          detail: { capability, state },
        })
      );
    }
  } catch { }
}

/**
 * Subscribes to real-time in-app permission changes across all components.
 * 
 * @param {(detail: { capability: 'camera'|'mic', state: 'granted'|'disabled'|'denied' }) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToPermissionChanges(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    if (e?.detail) callback(e.detail);
  };
  window.addEventListener(ARENA_PERM_EVENT, handler);
  return () => window.removeEventListener(ARENA_PERM_EVENT, handler);
}

