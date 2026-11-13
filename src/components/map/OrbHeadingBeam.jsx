import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Compass } from '../icons';

/**
 * Custom hook for capturing real-time device orientation & compass heading.
 * Handles iOS Safari 13+ permission prompts and Android Chrome absolute heading.
 * Includes shortest-path angle unwrapping so 359° -> 1° never spins backwards.
 */
export function useDeviceHeading() {
  const [heading, setHeading] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionState, setPermissionState] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unsupported'

  const continuousHeadingRef = useRef(0);
  const lastRawHeadingRef = useRef(0);

  // Check if device orientation API is available
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.DeviceOrientationEvent) {
      setIsSupported(false);
      setPermissionState('unsupported');
    }
  }, []);

  // Request permission (mandatory on iOS 13+ inside a user tap gesture)
  const requestHeadingPermission = useCallback(async () => {
    if (typeof window === 'undefined') return false;

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          setPermissionState('granted');
          setIsActive(true);
          return true;
        } else {
          setPermissionState('denied');
          setIsActive(false);
          return false;
        }
      } catch (err) {
        console.warn('Device orientation permission rejected:', err);
        setPermissionState('denied');
        setIsActive(false);
        return false;
      }
    } else {
      // Android / standard desktop / older iOS: permission granted implicitly
      setPermissionState('granted');
      setIsActive(true);
      return true;
    }
  }, []);

  // Toggle compass beam on/off
  const toggleHeading = useCallback(async () => {
    if (isActive) {
      setIsActive(false);
    } else {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        await requestHeadingPermission();
      } else {
        setIsActive(true);
      }
    }
  }, [isActive, requestHeadingPermission]);

  // Orientation event listener
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    const handleOrientation = (e) => {
      let rawHeading = null;

      // 1. iOS Safari provides webkitCompassHeading (0-360° clockwise relative to True Magnetic North)
      if (typeof e.webkitCompassHeading !== 'undefined' && e.webkitCompassHeading !== null) {
        rawHeading = e.webkitCompassHeading;
      }
      // 2. Android Chrome deviceorientationabsolute or standard alpha
      else if (e.alpha !== null && typeof e.alpha !== 'undefined') {
        // Standard alpha is counter-clockwise (0 to 360°); invert to clockwise
        rawHeading = (360 - e.alpha) % 360;
      }

      if (rawHeading === null || isNaN(rawHeading)) return;

      // Continuous shortest-path angle unwrapping so 359° <-> 1° smoothly interpolates without spinning 358°
      const prev = continuousHeadingRef.current;
      const diff = ((((rawHeading - (prev % 360)) + 540) % 360) - 180);
      const nextContinuous = prev + diff;

      continuousHeadingRef.current = nextContinuous;
      lastRawHeadingRef.current = rawHeading;
      setHeading(nextContinuous);
    };

    // Use deviceorientationabsolute if available on Android for true magnetic north, else fallback
    const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventName, handleOrientation, true);

    return () => {
      window.removeEventListener(eventName, handleOrientation, true);
    };
  }, [isActive]);

  return {
    heading,
    rawHeading: lastRawHeadingRef.current,
    isActive,
    isSupported,
    permissionState,
    toggleHeading,
    setIsActive,
  };
}

/**
 * Google Maps-style Flashlight Beam (Heading Cone)
 * Radiates a smooth, glowing cone of light in the direction the phone is physically facing.
 */
export function OrbHeadingBeam({ heading = 0, isActive = false, buildingOffset = 0 }) {
  // Real world heading adjusted by optional architectural floorplan bearing offset
  const finalAngle = heading + buildingOffset;

  return (
    <div
      className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 z-10 flex items-center justify-center transition-opacity duration-200 ease-out ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transform: `translate(-50%, -50%) rotate(${finalAngle}deg)`,
        transformOrigin: '50% 50%',
        transition: 'transform 0.08s ease-out, opacity 0.2s ease-out',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 160 160"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Flashlight Conic Glow Gradient */}
          <linearGradient id="orb-beam-gradient" x1="80" y1="80" x2="80" y2="5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
            <stop offset="25%" stopColor="#0ea5e9" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#0284c7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>

          {/* Secondary Soft Ambient Radial Bloom */}
          <radialGradient id="orb-beam-radial" cx="80" cy="80" r="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          {/* Subtle Outer Edge Glow */}
          <filter id="beam-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* 1. Ambient Glow Base Halo */}
        <circle cx="80" cy="80" r="28" fill="url(#orb-beam-radial)" />

        {/* 2. Soft Blurred Outer Beam for Atmospheric Haze */}
        <path
          d="M 80 80 L 42.5 15.05 A 75 75 0 0 1 117.5 15.05 Z"
          fill="url(#orb-beam-gradient)"
          filter="url(#beam-blur)"
          opacity="0.7"
        />

        {/* 3. Crisp Inner 60-degree Flashlight Cone */}
        <path
          d="M 80 80 L 42.5 15.05 A 75 75 0 0 1 117.5 15.05 Z"
          fill="url(#orb-beam-gradient)"
        />

        {/* 4. Center Forward Needle / Ray */}
        <line
          x1="80"
          y1="80"
          x2="80"
          y2="20"
          stroke="#7dd3fc"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="2 4"
          opacity="0.7"
        />

        {/* 5. Forward Tip Pointer Dot */}
        <circle cx="80" cy="18" r="2" fill="#e0f2fe" opacity="0.9" />
      </svg>
    </div>
  );
}

/**
 * Toolbar Button for Toggling Compass Direction (Fast & Butter-Smooth Black & White Theme)
 */
export function CompassToolbarButton({ isActive = false, onClick, title = "Toggle Facing Direction (Compass)" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="map-control relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 cursor-pointer select-none outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] active:scale-90 transition-transform duration-100 ease-out"
    >
      {/* Default / Inactive State Layer (Off) */}
      <span
        className={`absolute inset-0 rounded-lg bg-[#ebedf2] border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] transition-opacity duration-150 ease-out pointer-events-none ${
          isActive ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Active State Layer (On - Obsidian Black & White) */}
      <span
        className={`absolute inset-0 rounded-lg bg-gradient-to-b from-zinc-900 to-black border border-zinc-800/80 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.22),inset_0_1.5px_3px_rgba(255,255,255,0.45),1px_1px_3px_#c5ccd6] transition-opacity duration-150 ease-out pointer-events-none ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Compass Icon - Clean instant color transition with zero SVG re-render flash */}
      <Compass
        size={18}
        weight="bold"
        className={`relative z-10 transition-colors duration-150 ease-out ${
          isActive ? "text-white" : "text-zinc-600 hover:text-zinc-900"
        }`}
      />
    </button>
  );
}

export default OrbHeadingBeam;
