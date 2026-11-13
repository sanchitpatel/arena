import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  CheckCircle,
  Plus,
  Minus,
  ArrowClockwise,
  Crosshair,
  Sparkle,
  Ticket,
  Sword,
  Coffee,
  Brain,
  Crown,
  X,
  Scan,
} from '../icons';
import ChatGPTOrb from './ChatGPTOrb';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';
import { OrbHeadingBeam, CompassToolbarButton, useDeviceHeading } from '../map/OrbHeadingBeam';

/**
 * 6 Fixed Quest Locations on the Incubation Lab Floorplan
 * Coordinates are percentage-based (x: 0-100%, y: 0-100%) so they pin perfectly
 * across all screen sizes and aspect ratios.
 */
export const MAP_TASKS = [
  {
    id: 'quest-porch',
    title: 'Lab Entry Check-in',
    room: 'Porch',
    type: 'Check-in',
    difficulty: 'Easy',
    points: 100,
    x: 28.5,
    y: 84.5,
    gemColor: 'amber',
    gradient: 'from-amber-400 via-amber-500 to-yellow-600',
    glowColor: 'rgba(245, 158, 11, 0.75)',
    shadowColor: '#d97706',
    description: 'Check in at the incubation lab entry porch to initialize your player telemetry and claim your welcome tokens.',
    actionLabel: 'Claim Entry Points',
    actionType: 'instant',
    icon: Ticket,
  },
  {
    id: 'quest-living',
    title: 'Main Arena Stage',
    room: 'Living Room',
    type: 'Live Duel',
    difficulty: 'Medium',
    points: 250,
    x: 28.5,
    y: 57.5,
    gemColor: 'sapphire',
    gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    glowColor: 'rgba(14, 165, 233, 0.75)',
    shadowColor: '#0284c7',
    description: 'Take your seat in the main lounge arena. Challenge an opponent to a QR duel or answer the live crowd trivia question.',
    actionLabel: 'Open QR Scanner to Duel',
    actionType: 'scanner',
    icon: Sword,
  },
  {
    id: 'quest-kitchen',
    title: 'Refuel Station QR Hunt',
    room: 'Kitchen',
    type: 'Discovery',
    difficulty: 'Easy',
    points: 150,
    x: 74.0,
    y: 49.5,
    gemColor: 'emerald',
    gradient: 'from-emerald-400 via-emerald-500 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.75)',
    shadowColor: '#059669',
    description: 'Grab refreshments at the kitchen counter and locate the hidden sponsor QR code to claim your bonus energy points.',
    actionLabel: 'Scan Kitchen QR Code',
    actionType: 'scanner',
    icon: Coffee,
  },
  {
    id: 'quest-bed3',
    title: 'Hardware Prototype Demo',
    room: 'Bedroom 3',
    type: 'Demo Showcase',
    difficulty: 'Medium',
    points: 200,
    x: 78.5,
    y: 70.0,
    gemColor: 'amethyst',
    gradient: 'from-purple-400 via-fuchsia-500 to-indigo-600',
    glowColor: 'rgba(168, 85, 247, 0.75)',
    shadowColor: '#7c3aed',
    description: 'Inspect the live IoT hardware prototyping rigs built by our incubation cohort. Scan the device tag to record your test vote.',
    actionLabel: 'Verify Prototype Tag',
    actionType: 'scanner',
    icon: Brain,
  },
  {
    id: 'quest-mbedroom',
    title: "The Founder's Cipher",
    room: 'Master Bedroom',
    type: 'Secret Enigma',
    difficulty: 'Hard',
    points: 300,
    x: 27.0,
    y: 17.5,
    gemColor: 'ruby',
    gradient: 'from-rose-500 via-red-600 to-rose-700',
    glowColor: 'rgba(244, 63, 94, 0.75)',
    shadowColor: '#e11d48',
    description: 'A locked digital terminal rests in the VIP lounge. Unravel the clues across the room to unlock the founder cipher code.',
    actionLabel: 'Crack the Cipher',
    actionType: 'instant',
    icon: Sparkle,
  },
  {
    id: 'quest-bedroom',
    title: 'Lightning Pitch Corner',
    room: 'Bedroom',
    type: 'Pitch & Vote',
    difficulty: 'Medium',
    points: 200,
    x: 82.5,
    y: 18.5,
    gemColor: 'diamond',
    gradient: 'from-sky-300 via-indigo-400 to-cyan-300',
    glowColor: 'rgba(99, 102, 241, 0.75)',
    shadowColor: '#4f46e5',
    description: 'Cast your live attendee ballot for the best 60-second pitch demo or present your own startup idea to the mentor panel.',
    actionLabel: 'Scan Ballot QR',
    actionType: 'scanner',
    icon: Crown,
  },
];

const STORAGE_KEY_COMPLETED_TASKS = 'arena_completed_map_tasks';

// Synthesizes a clean, pleasant victory chime via Web Audio API
const playCrystalChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(523.25, now, 0.35);        // C5
    playTone(659.25, now + 0.08, 0.45); // E5
    playTone(783.99, now + 0.16, 0.65); // G5
    playTone(1046.5, now + 0.24, 0.85); // C6 (High sparkle)
  } catch { }
};

/**
 * 3D Multifaceted Floating Gemstone SVG Icon
 */
function FloatingGemIcon({ color = 'amber', gradient = 'from-amber-400 to-yellow-600', isCompleted = false }) {
  if (isCompleted) {
    return (
      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)] border-2 border-white scale-105">
        <CheckCircle size={18} weight="fill" className="text-white" />
      </div>
    );
  }

  return (
    <div className={`relative w-8 h-8 flex items-center justify-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]`}>
      <svg viewBox="0 0 24 24" className="w-8 h-8 transform rotate-0" fill="none">
        <defs>
          <linearGradient id={`gem-grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {color === 'amber' && (
              <>
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </>
            )}
            {color === 'sapphire' && (
              <>
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="50%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </>
            )}
            {color === 'emerald' && (
              <>
                <stop offset="0%" stopColor="#a7f3d0" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </>
            )}
            {color === 'amethyst' && (
              <>
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6b21a8" />
              </>
            )}
            {color === 'ruby' && (
              <>
                <stop offset="0%" stopColor="#fecdd3" />
                <stop offset="50%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#9f1239" />
              </>
            )}
            {color === 'diamond' && (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#3730a3" />
              </>
            )}
          </linearGradient>
        </defs>

        {/* Main Crystal Facet Geometry */}
        <polygon points="6,2 18,2 23,8 12,22 1,8" fill={`url(#gem-grad-${color})`} stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" />
        <polygon points="6,2 18,2 15,8 9,8" fill="rgba(255,255,255,0.45)" />
        <polygon points="1,8 9,8 12,22" fill="rgba(0,0,0,0.15)" />
        <polygon points="23,8 15,8 12,22" fill="rgba(0,0,0,0.22)" />
        <polygon points="9,8 15,8 12,22" fill="rgba(255,255,255,0.25)" />
        {/* Specular sparkle gleam */}
        <circle cx="8" cy="5" r="1" fill="#ffffff" opacity="0.9" />
      </svg>
    </div>
  );
}

export const MapView = ({ player, onNavigate, isActive = true }) => {
  const guestId = player?.guest_id || getPlayerId() || 'Guest001';
  const orbNumber = player?.orb_number || getOrbNumber(guestId) || 1;
  const displayName = player?.name || guestId;
  const avatar = player?.avatar || '1';

  // Gesture & Transform state
  const transformRef = useRef(null);
  const layerRef = useRef(null);
  const downPosRef = useRef({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);

  // Device orientation / Compass heading
  const { heading, isActive: isCompassActive, toggleHeading } = useDeviceHeading();

  const [selectedQuest, setSelectedQuest] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'

  // Load completed quest IDs from localStorage
  const [completedQuestIds, setCompletedQuestIds] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_COMPLETED_TASKS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Attendee Orb position on the map (defaults to Central Hallway)
  const [orbPosition, setOrbPosition] = useState({
    x: 52.5,
    y: 38.0,
    room: 'Central Corridor',
  });

  const [celebrationMessage, setCelebrationMessage] = useState('');

  // Determine room name from coordinates
  const resolveRoomName = (x, y) => {
    if (y > 78) return 'Porch / Entry';
    if (x < 48 && y > 38 && y <= 78) return 'Living Area';
    if (x >= 48 && y > 38 && y <= 62) return 'Kitchen';
    if (x >= 48 && y > 62 && y <= 78) return 'Bedroom 3';
    if (x < 48 && y <= 38) return 'Master Bedroom';
    if (x >= 48 && y <= 38) return 'Bedroom';
    return 'Central Corridor';
  };

  const wasDrag = (e) => Math.hypot(e.clientX - downPosRef.current.x, e.clientY - downPosRef.current.y) > 10;

  // Scale change handler (scroll fix & CSS variable counter-scaling)
  const handleScaleChange = (scale) => {
    if (typeof scale !== 'number' || isNaN(scale)) return;
    const zoomed = scale > 1.01;
    setIsZoomed((prev) => (prev !== zoomed ? zoomed : prev));
    layerRef.current?.style.setProperty('--inv-scale', String(1 / scale));
  };

  // Reset transform when tab becomes inactive
  useEffect(() => {
    if (!isActive) {
      transformRef.current?.resetTransform();
    }
  }, [isActive]);

  // Move Orb on direct map click/tap (guarded against dragging gestures)
  const handleMapClick = (e) => {
    if (wasDrag(e)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(8, Math.min(92, Number(clickX.toFixed(1))));
    const clampedY = Math.max(6, Math.min(94, Number(clickY.toFixed(1))));

    const roomName = resolveRoomName(clampedX, clampedY);
    setOrbPosition({
      x: clampedX,
      y: clampedY,
      room: roomName,
    });

    if (navigator?.vibrate) {
      navigator.vibrate(20);
    }
  };

  // Select Quest logic shared by map gem clicks and directory list clicks
  const selectQuest = (quest) => {
    setSelectedQuest(quest);

    // Glide orb adjacent to the gem
    const offsetX = quest.x > 50 ? quest.x - 9 : quest.x + 9;
    const offsetY = quest.y > 50 ? quest.y - 4 : quest.y + 4;

    setOrbPosition({
      x: Number(offsetX.toFixed(1)),
      y: Number(offsetY.toFixed(1)),
      room: quest.room,
    });

    if (navigator?.vibrate) {
      navigator.vibrate([25, 40]);
    }
  };

  // Move Orb smoothly to a Gem location when tapped on the map
  const handleGemClick = (e, quest) => {
    if (wasDrag(e)) return;
    e.stopPropagation();
    selectQuest(quest);
  };

  // Complete a quest
  const handleCompleteQuest = (quest) => {
    if (completedQuestIds.includes(quest.id)) return;

    const next = [...completedQuestIds, quest.id];
    setCompletedQuestIds(next);
    try {
      window.localStorage.setItem(STORAGE_KEY_COMPLETED_TASKS, JSON.stringify(next));
    } catch { }

    playCrystalChime();

    if (navigator?.vibrate) {
      navigator.vibrate([40, 80, 40]);
    }

    setCelebrationMessage(`+${quest.points} PTS Earned! ${quest.title} Completed!`);
    setTimeout(() => {
      setCelebrationMessage('');
    }, 3200);
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (filter === 'active') {
      return MAP_TASKS.filter((t) => !completedQuestIds.includes(t.id));
    }
    if (filter === 'completed') {
      return MAP_TASKS.filter((t) => completedQuestIds.includes(t.id));
    }
    return MAP_TASKS;
  }, [filter, completedQuestIds]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center select-none font-sans pb-12 pt-1">
      {/* Floating Celebration Toast */}
      {celebrationMessage && (
        <div className="fixed top-16 z-50 animate-in fade-in slide-in-from-top-3 duration-200 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold shadow-2xl border border-emerald-400 flex items-center gap-2">
          <Sparkle size={18} weight="fill" className="text-yellow-300 animate-spin" />
          <span>{celebrationMessage}</span>
        </div>
      )}

      {/* Main Floorplan Canvas Frame (Outer Thick White Wall with Inward Shadow & Inside White Background) */}
      <div className="relative w-full max-w-[420px] sm:max-w-[520px] md:max-w-[560px] flex flex-col items-center">
        {/* Interactive Floorplan Window */}
        <div
          onPointerDownCapture={(e) => {
            downPosRef.current = { x: e.clientX, y: e.clientY };
          }}
          className="relative w-full aspect-square max-h-[76vh] overflow-hidden rounded-[16px] sm:rounded-[20px] bg-white border-4 border-white shadow-[inset_3px_3px_8px_#c2c9d4,inset_-3px_-3px_8px_#ffffff,8px_8px_20px_#c2c9d4,-8px_-8px_20px_#ffffff] select-none"
          style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}
        >
          {/* Inward Shadow Overlay Layer (Ensures crisp inward shadow on top of floorplan edges) */}
          <div className="pointer-events-none absolute inset-0 rounded-[12px] shadow-[inset_3px_3px_8px_#c2c9d4,inset_-3px_-3px_8px_#ffffff] z-20" />

          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={1}
            maxScale={3}
            centerOnInit
            limitToBounds
            centerZoomedOut
            doubleClick={{ mode: 'zoomIn', step: 0.7 }}
            pinch={{ step: 5 }}
            wheel={{ step: 0.15 }}
            panning={{ excluded: ['map-control'] }}
            onTransformed={(ref, state) => handleScaleChange(state?.scale ?? ref?.state?.scale)}
            onTransform={(ref, state) => handleScaleChange(state?.scale ?? ref?.state?.scale)}
          >
            {({ zoomIn, zoomOut, resetTransform, zoomToElement }) => (
              <>
                {/* Floating Zoom & Locate Toolbar (Top Right of Floorplan) */}
                <div className="map-control absolute top-0.5 right-0.5 z-30 flex flex-col gap-1.5 bg-white/90 backdrop-blur-md p-1 rounded-lg border border-slate-200/80 shadow-md">
                  <button
                    type="button"
                    onClick={() => zoomIn(0.5)}
                    title="Zoom In"
                    className="map-control w-7 h-7 rounded-lg bg-[#f0f2f5] hover:bg-slate-200 active:scale-90 text-zinc-800 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={17} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomOut(0.5)}
                    title="Zoom Out"
                    className="map-control w-7 h-7 rounded-lg bg-[#f0f2f5] hover:bg-slate-200 active:scale-90 text-zinc-800 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                  >
                    <Minus size={17} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => resetTransform()}
                    title="Reset View"
                    className="map-control w-7 h-7 rounded-lg bg-[#f0f2f5] hover:bg-slate-200 active:scale-90 text-zinc-800 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                  >
                    <ArrowClockwise size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomToElement('attendee-orb', 1.6, 300)}
                    title="Center on My Orb"
                    className="map-control w-7 h-7 rounded-lg bg-sky-100 hover:bg-sky-200/80 active:scale-90 text-sky-700 flex items-center justify-center transition-all cursor-pointer shadow-sm border border-sky-300"
                  >
                    <Crosshair size={19} weight="bold" />
                  </button>
                  <CompassToolbarButton
                    isActive={isCompassActive}
                    onClick={toggleHeading}
                    title={isCompassActive ? "Turn Off Compass Beam" : "Show Phone Facing Direction (Compass Beam)"}
                  />
                </div>

                <TransformComponent
                  wrapperClass="!w-full !h-full"
                  contentClass="!w-full !h-full"
                >
                  {/* Scalable & Pannable Floorplan Layer */}
                  <div
                    ref={layerRef}
                    onClick={handleMapClick}
                    className="relative w-full h-full select-none"
                  >
                    {/* The 2D Floorplan Image */}
                    <img
                      src="/map/floorplan.jpg"
                      alt="Incubation Lab 2D Floor Plan"
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />

                    {/* ========================================================
                        A. FLOATING GEMS (Tasks Pinned to Specific Rooms)
                        ======================================================== */}
                    {MAP_TASKS.map((quest) => {
                      const isCompleted = completedQuestIds.includes(quest.id);
                      const isSelected = selectedQuest?.id === quest.id;

                      return (
                        <div
                          key={quest.id}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none group flex flex-col items-center"
                          style={{
                            left: `${quest.x}%`,
                            top: `${quest.y}%`,
                          }}
                          title={`${quest.title} (${quest.room})`}
                        >
                          <div
                            onClick={(e) => handleGemClick(e, quest)}
                            style={{
                              transform: 'scale(var(--inv-scale, 1))',
                              transformOrigin: 'center center',
                            }}
                            className="relative pointer-events-auto cursor-pointer flex flex-col items-center"
                          >
                            {/* Beacon Sonar Ground Pulse */}
                            {!isCompleted && (
                              <div
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full animate-beacon-pulse pointer-events-none"
                                style={{ backgroundColor: quest.glowColor }}
                              />
                            )}

                            {/* Multifaceted Gemstone with Smooth Hover & Float Animation */}
                            <div
                              className={`relative z-10 transition-transform duration-200 group-hover:scale-125 ${
                                isCompleted ? '' : 'animate-gem-float'
                              }`}
                            >
                              <FloatingGemIcon
                                color={quest.gemColor}
                                gradient={quest.gradient}
                                isCompleted={isCompleted}
                              />
                            </div>

                            {/* Compact floating points pill */}
                            <div
                              className={`mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-tight border shadow-sm backdrop-blur-md transition-all group-hover:scale-110 ${
                                isCompleted
                                  ? 'bg-emerald-500/90 text-white border-emerald-300'
                                  : isSelected
                                    ? 'bg-zinc-900 text-white border-white scale-105'
                                    : 'bg-white/95 text-zinc-800 border-slate-300/80'
                              }`}
                            >
                              {isCompleted ? '✓ Done' : `+${quest.points}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* ========================================================
                        B. ATTENDEE'S FLOATING ORB (Interactive on the Map)
                        ======================================================== */}
                    <div
                      id="attendee-orb"
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center"
                      style={{
                        left: `${orbPosition.x}%`,
                        top: `${orbPosition.y}%`,
                        transition: 'left 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      <div
                        style={{
                          transform: 'scale(var(--inv-scale, 1))',
                          transformOrigin: 'center center',
                        }}
                        className="relative flex flex-col items-center"
                      >
                        {/* Google Maps-style Flashlight Heading Beam (Phone Orientation) */}
                        <OrbHeadingBeam heading={heading} isActive={isCompassActive} />

                        {/* Ground Shadow & Atmospheric Glow Aura */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-sky-400/40 blur-md pointer-events-none animate-pulse" />

                        {/* The Actual Attendee Orb Component */}
                        <div className="relative animate-orb-float">
                          <ChatGPTOrb
                            orbNumber={orbNumber}
                            avatar={avatar}
                            size="w-11 h-11 sm:w-11 sm:h-11"
                            numberSize="text-xl sm:text-[22px]"
                            labelSize="text-[7px] sm:text-[8.5px]"
                            badge={null}
                            speed={0.8}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>

        {/* Floorplan Tap Tip */}
        <p className="text-[11px] text-zinc-500 font-semibold text-center mt-2.5 leading-snug">
          Tap any floating Gem to view quest
        </p>
      </div>

      {/* 3. Quest Details Modal / Bottom Drawer */}
      {selectedQuest && (
        <div className="w-full max-w-[420px] sm:max-w-[520px] md:max-w-[560px] mt-3.5 bg-white border border-slate-200/90 rounded-[28px] p-4 shadow-[0_12px_32px_rgba(197,204,214,0.5)] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-3 pb-2.5 mb-2.5 border-b border-zinc-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <FloatingGemIcon
                color={selectedQuest.gemColor}
                gradient={selectedQuest.gradient}
                isCompleted={completedQuestIds.includes(selectedQuest.id)}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-zinc-600 border border-slate-200">
                    {selectedQuest.room}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {selectedQuest.difficulty}
                  </span>
                </div>
                <h3 className="font-arena text-sm font-black text-zinc-900 tracking-wide mt-1 truncate">
                  {selectedQuest.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedQuest(null)}
              className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            {selectedQuest.description}
          </p>

          <div className="mt-3.5 flex items-center justify-between gap-2.5 pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-500">Reward:</span>
              <span className="font-arena text-sm font-black text-emerald-600">
                +{selectedQuest.points} PTS
              </span>
            </div>

            {completedQuestIds.includes(selectedQuest.id) ? (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                <span>Completed</span>
              </div>
            ) : selectedQuest.actionType === 'scanner' ? (
              <button
                type="button"
                onClick={() => {
                  if (typeof onNavigate === 'function') onNavigate('scanner');
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold border border-zinc-800 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3)] hover:from-zinc-800 hover:to-zinc-900 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Scan size={16} weight="bold" />
                <span>{selectedQuest.actionLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleCompleteQuest(selectedQuest)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 text-white text-xs font-bold border border-emerald-500 shadow hover:from-emerald-500 hover:to-emerald-600 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkle size={16} weight="bold" />
                <span>{selectedQuest.actionLabel}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Filter Pills & Quest Directory */}
      <div className="w-full max-w-[420px] sm:max-w-[520px] md:max-w-[560px] mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
            Quest Objectives ({MAP_TASKS.length})
          </span>
          <div className="flex items-center gap-1 bg-[#ebedf2] p-1 rounded-xl border border-white shadow-inner">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${filter === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${filter === 'active' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${filter === 'completed' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                }`}
            >
              Done
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {filteredTasks.map((quest) => {
            const isDone = completedQuestIds.includes(quest.id);
            const isSelected = selectedQuest?.id === quest.id;
            const Icon = quest.icon;

            return (
              <div
                key={quest.id}
                onClick={() => selectQuest(quest)}
                className={`p-3 rounded-2xl bg-[#ebedf2] border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${isSelected
                    ? 'border-sky-500 shadow-[inset_2px_2px_4px_#cbd2de,inset_-2px_-2px_4px_#ffffff]'
                    : isDone
                      ? 'border-emerald-300/80 shadow-[inset_1px_1px_3px_#c8d0db,inset_-1px_-1px_3px_#ffffff] opacity-80'
                      : 'border-white/80 shadow-[3px_3px_6px_#c8d0db,-3px_-3px_6px_#ffffff] hover:shadow-[2px_2px_4px_#c8d0db,-2px_-2px_4px_#ffffff]'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white shadow-sm ${isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gradient-to-b from-zinc-800 to-zinc-950 text-white'
                      }`}
                  >
                    {isDone ? (
                      <CheckCircle size={18} weight="fill" />
                    ) : (
                      <Icon size={18} weight="bold" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9.5px] font-bold uppercase text-zinc-500">
                        {quest.room}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-zinc-900 truncate">
                      {quest.title}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-arena text-xs font-black text-zinc-700">
                    +{quest.points}
                  </span>
                  {isDone && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MapView;
