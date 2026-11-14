import React, { useState, useEffect, useRef } from 'react';
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
import { CrystalIcon } from './CrystalIcon';
import { getPlayerId, getOrbNumber } from '../../utils/playerId';
import { OrbHeadingBeam, CompassToolbarButton, useDeviceHeading } from '../map/OrbHeadingBeam';
import { QuestSliderCard } from '../map/QuestSliderCard';

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
    x: 31.0,
    y: 82.5,
    gemColor: 'amber',
    gradient: 'from-amber-400 via-amber-500 to-yellow-600',
    glowColor: 'rgba(165, 180, 252, 0.50)',
    shadowColor: '#a5b4fc',
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
    x: 43.0,
    y: 60.0,
    gemColor: 'sapphire',
    gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    glowColor: 'rgba(165, 180, 252, 0.50)',
    shadowColor: '#a5b4fc',
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
    x: 68.0,
    y: 51.0,
    gemColor: 'emerald',
    gradient: 'from-emerald-400 via-emerald-500 to-teal-600',
    glowColor: 'rgba(165, 180, 252, 0.50)',
    shadowColor: '#a5b4fc',
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
    x: 66.5,
    y: 72.5,
    gemColor: 'amethyst',
    gradient: 'from-purple-400 via-fuchsia-500 to-indigo-600',
    glowColor: 'rgba(165, 180, 252, 0.50)',
    shadowColor: '#a5b4fc',
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
    x: 36.0,
    y: 22.0,
    gemColor: 'ruby',
    gradient: 'from-rose-500 via-red-600 to-rose-700',
    glowColor: 'rgba(165, 180, 252, 0.50)',
    shadowColor: '#a5b4fc',
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
    x: 67.0,
    y: 20.5,
    gemColor: 'diamond',
    gradient: 'from-sky-300 via-indigo-400 to-cyan-300',
    glowColor: 'rgba(165, 180, 252, 0.50)',
    shadowColor: '#a5b4fc',
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
 * 3D Prismatic Quartz Crystal Icon
 * Exact SVG design built from public/crystal.md
 */
function FloatingGemIcon({ color = 'amber', gradient = 'from-amber-400 to-yellow-600', isCompleted = false }) {
  if (isCompleted) {
    return (
      <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)] border-2 border-white scale-105">
        <CheckCircle size={18} weight="fill" className="text-white" />
      </div>
    );
  }

  return (
    <div className="relative w-9 h-12 sm:w-12 sm:h-16 flex items-center justify-center filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.30)]">
      <CrystalIcon color={color} className="w-full h-full" />
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
    if (selectedQuest) {
      setSelectedQuest(null);
    }
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
                            className="relative pointer-events-auto cursor-pointer flex flex-col items-center"
                          >
                            {/* Luminous Prismatic Crystal with Perfectly Concentric Glowing Base */}
                            <div className="relative z-10 w-11 h-15 sm:w-12 sm:h-16 flex items-center justify-center transition-transform duration-200 group-hover:scale-125">
                              {/* Beacon Sonar Ground Pulse (Concentric behind crystal center) */}
                              {!isCompleted && (
                                <div
                                  className="absolute inset-0 m-auto w-12 h-12 rounded-full animate-beacon-pulse pointer-events-none z-0 blur-[1px]"
                                  style={{ backgroundColor: quest.glowColor }}
                                />
                              )}

                              <div className="relative z-10 w-full h-full flex items-center justify-center">
                                <FloatingGemIcon
                                  color={quest.gemColor}
                                  gradient={quest.gradient}
                                  isCompleted={isCompleted}
                                />
                              </div>
                            </div>

                            {/* Compact floating points pill */}
                            <div
                              className={`mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-tight border shadow-sm backdrop-blur-md transition-all group-hover:scale-110 ${isCompleted
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
                        <div className="relative">
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
        <p className="text-[11px] text-zinc-400 font-semibold text-center mt-2.5 leading-snug">
          Tap any floating Crystal to view quest details
        </p>
      </div>

      {/* Floating Task Details Slider Card (Slides up from behind bottom tab bar) */}
      <QuestSliderCard
        quest={selectedQuest}
        isCompleted={selectedQuest ? completedQuestIds.includes(selectedQuest.id) : false}
        onClose={() => setSelectedQuest(null)}
        onNavigate={onNavigate}
        onComplete={handleCompleteQuest}
      />
    </div>
  );
};

export default MapView;
