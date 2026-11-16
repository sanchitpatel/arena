import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Lightbulb,
  ThumbsUp,
  Plus,
  Sparkle,
  Crown,
  TrendUp,
  CheckCircle,
  CircleNotch,
  X,
  MagnifyingGlass,
  User,
  PaperPlaneTilt,
  PencilSimple,
  Stack,
  Clock,
  ArrowRight,
  Brain,
  Atom,
  Dna,
  DeviceMobile,
  Check,
} from '../icons';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { getPlayerId, getOrbNumber, getStoredOrbNumber } from '../../utils/playerId';
import { normalizePitchTitle, normalizePitchDescription } from '../../utils/sanitize';

const STORAGE_VOTES_KEY = 'arena_pitch_wall_votes';
const STORAGE_CUSTOM_PITCHES_KEY = 'arena_pitch_wall_custom_pitches';

const CATEGORIES = [
  { id: 'All', label: 'All', icon: Sparkle },
  { id: 'AI & Agents', label: 'AI & Agents', icon: Brain },
  { id: 'Hardware & Robotics', label: 'Hardware', icon: Atom },
  { id: 'Web3 & Systems', label: 'Web3', icon: Crown },
  { id: 'BioTech & Health', label: 'BioTech', icon: Dna },
  { id: 'Consumer Apps', label: 'Consumer', icon: DeviceMobile },
];

const STAGES = ['Concept', 'Prototype Demo', 'Live Beta'];

const INITIAL_PITCHES = [
  {
    id: 'pitch-1',
    title: 'Autonomous EHR Scribe & Clinical Agent',
    category: 'AI & Agents',
    presenter: 'Dr. Elena Vance',
    avatar: '7',
    guestId: 'Guest012',
    summary: 'Ambient clinical listening that converts doctor-patient conversations into structured ICD-10 notes and real-time drug interaction alerts in under 2 seconds.',
    votes: 124,
    stage: 'Live Beta',
    timeAgo: '14m ago',
    timestamp: Date.now() - 14 * 60 * 1000,
  },
  {
    id: 'pitch-2',
    title: 'Gamified PT with LiDAR Spatial Tracking',
    category: 'Hardware & Robotics',
    presenter: 'Alex Chen',
    avatar: '14',
    guestId: 'Guest045',
    summary: 'Using smartphone LiDAR to turn post-op orthopedic rehab exercises into an immersive rhythm mini-game with millimeter-accurate range-of-motion metrics.',
    votes: 98,
    stage: 'Prototype Demo',
    timeAgo: '32m ago',
    timestamp: Date.now() - 32 * 60 * 1000,
  },
  {
    id: 'pitch-3',
    title: 'Sub-4min Drone Defibrillator Dispatch',
    category: 'Hardware & Robotics',
    presenter: 'Sarah Jenkins',
    avatar: '21',
    guestId: 'Guest088',
    summary: 'Sub-4-minute urban drone deployment delivering automated external defibrillator (AED) units and voice-guided CPR instruction to cardiac arrest scenes before ambulances arrive.',
    votes: 86,
    stage: 'Prototype Demo',
    timeAgo: '1h ago',
    timestamp: Date.now() - 60 * 60 * 1000,
  },
  {
    id: 'pitch-4',
    title: 'Point-of-Care Blood Biomarker Spectrometer',
    category: 'BioTech & Health',
    presenter: 'Marcus Thorne',
    avatar: '3',
    guestId: 'Guest033',
    summary: 'Pocket spectrophotometer analyzing a single blood droplet for troponin, CRP, and creatinine in 90 seconds using microfluidic sensor chips.',
    votes: 74,
    stage: 'Lab Tested',
    timeAgo: '2h ago',
    timestamp: Date.now() - 120 * 60 * 1000,
  },
  {
    id: 'pitch-5',
    title: 'Zero-Knowledge Venue Access & Health Pass',
    category: 'Web3 & Systems',
    presenter: 'Leo Tanaka',
    avatar: '18',
    guestId: 'Guest061',
    summary: 'Cryptographically proven health credentialing allowing attendees to share verified lab clearances without exposing any underlying medical history or personal identity.',
    votes: 62,
    stage: 'Concept',
    timeAgo: '3h ago',
    timestamp: Date.now() - 180 * 60 * 1000,
  },
  {
    id: 'pitch-6',
    title: 'Haptic Feedback VR Surgical Training Gloves',
    category: 'AI & Agents',
    presenter: 'Nina Patel',
    avatar: '29',
    guestId: 'Guest074',
    summary: 'Next-gen pneumatic force-feedback gloves enabling residents to feel realistic tissue resistance and micro-vascular tension in virtual reality surgical simulations.',
    votes: 55,
    stage: 'Prototype Demo',
    timeAgo: '4h ago',
    timestamp: Date.now() - 240 * 60 * 1000,
  },
];

export const IdeasPitchWallView = ({ player }) => {
  // Current user identity resolution
  const guestId = player?.guest_id || getPlayerId() || null;
  const orbNumber = player?.orb_number || (guestId ? getOrbNumber(guestId) : null) || getStoredOrbNumber() || '?';
  const displayName = player?.name || guestId || 'Player';
  const avatar = player?.avatar || '1';

  // Active view section: 'pitch' (Submit Idea) | 'wall' (Explore & Vote)
  const [activeSection, setActiveSection] = useState('pitch');

  // Pitches state with localStorage persistence
  const [pitches, setPitches] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_PITCHES_KEY);
      if (stored) {
        const custom = JSON.parse(stored);
        if (Array.isArray(custom)) {
          return [...custom, ...INITIAL_PITCHES];
        }
      }
    } catch {}
    return INITIAL_PITCHES;
  });

  // Track voted pitch IDs
  const [votedIds, setVotedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_VOTES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Feed filtering & sorting
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('votes'); // 'votes' | 'recent'
  const [searchQuery, setSearchQuery] = useState('');

  // Submit Idea Form State (Simple: Idea/Problem & Description)
  const [formTitle, setFormTitle] = useState('');
  const [formPitch, setFormPitch] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTitleChange = (e) => {
    // Real-time normalization prevents malicious scripts/tags from ever entering state
    const normalized = normalizePitchTitle(e.target.value, 100);
    setFormTitle(normalized);
    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
  };

  const handlePitchChange = (e) => {
    // Real-time normalization prevents malicious scripts/tags from ever entering state
    const normalized = normalizePitchDescription(e.target.value, 500);
    setFormPitch(normalized);
    if (errors.pitch) setErrors((prev) => ({ ...prev, pitch: '' }));
  };

  const validate = () => {
    const newErrors = {};
    const cleanTitle = normalizePitchTitle(formTitle, 100).trim();
    const cleanPitch = normalizePitchDescription(formPitch, 500).trim();

    if (!cleanTitle) {
      newErrors.title = 'Idea or Problem title is required.';
    } else if (cleanTitle.length < 4) {
      newErrors.title = 'Title must be at least 4 characters.';
    }
    if (!cleanPitch) {
      newErrors.pitch = 'Description is required.';
    } else if (cleanPitch.length < 15) {
      newErrors.pitch = 'Please provide at least 15 characters explaining your idea or problem.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle voting and un-voting
  const handleVote = useCallback((pitchId) => {
    const isVoted = votedIds.includes(pitchId);
    let updatedVotes;

    if (isVoted) {
      updatedVotes = votedIds.filter((id) => id !== pitchId);
      setPitches((prev) =>
        prev.map((p) => (p.id === pitchId ? { ...p, votes: Math.max(0, p.votes - 1) } : p))
      );
      setToastMessage({
        type: 'info',
        title: 'Ballot Revoked',
        description: 'You took back your vote for this concept.',
      });
    } else {
      updatedVotes = [...votedIds, pitchId];
      setPitches((prev) =>
        prev.map((p) => (p.id === pitchId ? { ...p, votes: p.votes + 1 } : p))
      );
      setToastMessage({
        type: 'success',
        title: '+10 Arena PTS Earned!',
        description: 'Ballot cast for this pitch demo! Thanks for voting.',
      });
    }

    setVotedIds(updatedVotes);
    try {
      localStorage.setItem(STORAGE_VOTES_KEY, JSON.stringify(updatedVotes));
    } catch {}
  }, [votedIds]);

  // Handle new pitch submission
  const handleSubmitPitch = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const cleanTitle = normalizePitchTitle(formTitle, 100).trim();
    const cleanPitch = normalizePitchDescription(formPitch, 500).trim();

    const newPitch = {
      id: `pitch-${Date.now()}`,
      title: cleanTitle,
      category: 'General',
      presenter: displayName,
      avatar: String(avatar),
      guestId: guestId,
      summary: cleanPitch,
      votes: 1, // User gets an immediate self-vote
      stage: 'Concept',
      timeAgo: 'Just now',
      timestamp: Date.now(),
      isMyPitch: true,
    };

    setTimeout(() => {
      const updated = [newPitch, ...pitches];
      setPitches(updated);

      // Persist custom pitch in storage
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_PITCHES_KEY) || '[]');
        localStorage.setItem(STORAGE_CUSTOM_PITCHES_KEY, JSON.stringify([newPitch, ...existing]));
      } catch {}

      // Automatically register user's own initial ballot
      const newVoted = [...votedIds, newPitch.id];
      setVotedIds(newVoted);
      try {
        localStorage.setItem(STORAGE_VOTES_KEY, JSON.stringify(newVoted));
      } catch {}

      // Reset form fields
      setFormTitle('');
      setFormPitch('');
      setErrors({});
      setIsSubmitting(false);

      // Switch back to wall view so user sees their new pitch live
      setActiveSection('wall');

      setToastMessage({
        type: 'success',
        title: 'Pitch Published to Wall! 🚀',
        description: '+10 Arena PTS earned! Your concept is live for peer ballots.',
      });
    }, 200);
  };

  // Filtered and sorted pitches
  const filteredPitches = useMemo(() => {
    return pitches
      .filter((pitch) => {
        const matchesCategory =
          selectedCategory === 'All' ||
          pitch.category === selectedCategory ||
          (selectedCategory === 'AI & Agents' && (pitch.category.includes('AI') || pitch.category.includes('Scribe'))) ||
          (selectedCategory === 'Hardware & Robotics' && (pitch.category.includes('Hardware') || pitch.category.includes('MedTech') || pitch.category.includes('Robotics') || pitch.category.includes('Devices'))) ||
          (selectedCategory === 'BioTech & Health' && (pitch.category.includes('BioTech') || pitch.category.includes('Diagnostics') || pitch.category.includes('Hospital') || pitch.category.includes('Health') || pitch.category.includes('Ops'))) ||
          (selectedCategory === 'Consumer Apps' && (pitch.category.includes('Apps') || pitch.category.includes('Patient')));
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          pitch.title.toLowerCase().includes(q) ||
          pitch.summary.toLowerCase().includes(q) ||
          pitch.presenter.toLowerCase().includes(q) ||
          pitch.category.toLowerCase().includes(q);
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'votes') {
          return b.votes - a.votes;
        }
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
  }, [pitches, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-5 pb-20 font-sans select-none">
      {/* Floating Arena Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[100] w-[92%] sm:w-auto max-w-sm bg-[#ebedf2]/95 backdrop-blur-xl border border-white/90 rounded-2xl px-4 py-3 shadow-[inset_2px_2px_4px_#ffffff,inset_-2px_-2px_4px_#c5ccd6,0_8px_24px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600'
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-600'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle size={18} weight="bold" />
              ) : (
                <Sparkle size={18} weight="bold" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 leading-tight truncate">
                {toastMessage.title}
              </h4>
              <p className="text-[11px] text-zinc-600 leading-tight mt-0.5 truncate">
                {toastMessage.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="w-6 h-6 rounded-lg bg-[#ebedf2] shadow-[1px_1px_3px_#c5ccd6,-1px_-1px_3px_#ffffff] flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors shrink-0 cursor-pointer active:scale-90"
          >
            <X size={13} weight="bold" />
          </button>
        </div>
      )}

      {/* ========================================================
          TOP HEADER TITLE & DESCRIPTION
          ======================================================== */}
      <div className="text-center pt-1 pb-2">
        <h1
          className="font-arena text-2xl sm:text-2xl font-black tracking-tighter text-zinc-700 uppercase"
          style={{ WebkitTextStroke: '1.6px currentColor' }}
        >
          Pitch Wall
        </h1>
        <p className="text-[11px] sm:text-[13px] text-zinc-500 font-medium max-w-md mx-auto leading-relaxed">
          Share your ideas/Problems & vote for the best pitches of the event.
        </p>
      </div>

      {/* ========================================================
          TWO-SECTION SWITCHER (Fixed-Dimension Smooth Crossfade Switcher)
          1. Submit Idea (Left)
          2. Explore & Vote (Right)
          ======================================================== */}
      <div 
        role="tablist"
        aria-label="Pitch wall section toggle"
        className="w-full bg-[#F5F6F7]/80 p-1 rounded-2xl border border-white/80 shadow-[inset_2px_2px_5px_#c8d0db,inset_-2px_-2px_5px_#ffffff] relative flex items-center select-none gap-1 overflow-hidden"
      >
        {/* Left Tab: Submit Idea (Constant Dimension) */}
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'pitch'}
          onClick={() => setActiveSection('pitch')}
          className="flex-1 relative py-2 px-3 rounded-xl text-[13px] sm:text-sm flex items-center justify-center cursor-pointer select-none text-center whitespace-nowrap overflow-hidden active:scale-[0.98]"
        >
          {/* Active Dark Gradient Pill (Fades in/out smoothly without resizing) */}
          <span
            aria-hidden="true"
            className={`absolute inset-0 rounded-xl bg-gradient-to-b from-zinc-900 to-black shadow-[inset_0_-2px_4px_rgba(0,0,0,0.22),inset_0_2px_4px_rgba(255,255,255,0.4),2px_2px_5px_#c5ccd6] border border-zinc-800/80 pointer-events-none transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              activeSection === 'pitch' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <span
            className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              activeSection === 'pitch'
                ? 'text-white font-bold'
                : 'text-zinc-700 hover:text-zinc-900 font-semibold'
            }`}
          >
            <PencilSimple size={19} weight="bold" className="shrink-0" />
            <span>Submit Idea</span>
          </span>
        </button>

        {/* Right Tab: Explore & Vote (Constant Dimension) */}
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'wall'}
          onClick={() => setActiveSection('wall')}
          className="flex-1 relative py-2 px-3 rounded-xl text-[13px] sm:text-sm flex items-center justify-center cursor-pointer select-none text-center whitespace-nowrap overflow-hidden active:scale-[0.98]"
        >
          {/* Active Dark Gradient Pill (Fades in/out smoothly without resizing) */}
          <span
            aria-hidden="true"
            className={`absolute inset-0 rounded-xl bg-gradient-to-b from-zinc-900 to-black shadow-[inset_0_-2px_4px_rgba(0,0,0,0.22),inset_0_2px_4px_rgba(255,255,255,0.4),2px_2px_5px_#c5ccd6] border border-zinc-800/80 pointer-events-none transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              activeSection === 'wall' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <span
            className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              activeSection === 'wall'
                ? 'text-white font-bold'
                : 'text-zinc-700 hover:text-zinc-900 font-semibold'
            }`}
          >
            <Stack size={19} weight="bold" className="shrink-0" />
            <span>Explore & Vote</span>
          </span>
        </button>
      </div>

      {/* ========================================================
          SECTION 1: PITCH AN IDEA (Simple 2-Field Form: Idea/Problem & Description)
          ======================================================== */}
      {activeSection === 'pitch' && (
        <form
          onSubmit={handleSubmitPitch}
          noValidate
          className="!mt-8 sm:!mt-7 bg-[#ebedf2] border border-white/80 rounded-[1rem] p-5 sm:p-8 shadow-[-3px_-3px_10px_rgba(0,0,0,0.06),3px_3px_10px_rgba(255,255,255,0.65),inset_4px_4px_12px_#ffffff,inset_-4px_-4px_12px_rgba(0,0,0,0.14)] space-y-4 sm:space-y-5 animate-in fade-in duration-150"
        >
          {/* Field 1: Idea / Problem */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5 ml-1">
              Idea / Problem <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-700 transition-colors">
                <Lightbulb size={19} weight="bold" />
              </div>
              <input
                type="text"
                placeholder="e.g. AI OPD Scribe, Smart ICU Alert..."
                value={formTitle}
                onChange={handleTitleChange}
                maxLength={100}
                style={{ outline: 'none' }}
                className={`w-full pl-11 pr-4 py-2.5 sm:py-3 bg-[#F2F7FC] rounded-2xl text-xs sm:text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)] transition-[box-shadow] duration-150 ease-out font-medium ${
                  errors.title ? 'shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(244,63,94,0.6)]' : ''
                }`}
              />
            </div>
            {errors.title && (
              <p className="text-[10.5px] text-rose-600 font-medium ml-1.5 mt-1.5">{errors.title}</p>
            )}
          </div>

          {/* Field 2: Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
              <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                Description <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className={`text-[10.5px] font-bold ${formPitch.length > 500 ? 'text-amber-600' : 'text-zinc-400'}`}>
                {formPitch.length}/500
              </span>
            </div>
            <div className="relative group">
              <textarea
                rows={4}
                maxLength={500}
                placeholder="Describe the clinical problem or idea in detail (what is the problem, your solution, and the impact)..."
                value={formPitch}
                onChange={handlePitchChange}
                style={{ outline: 'none' }}
                className={`w-full p-3.5 sm:p-4 bg-[#F2F7FC] rounded-2xl text-xs sm:text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(244,63,94,0.6)] font-medium leading-relaxed ${
                  errors.pitch ? 'shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(244,63,94,0.6)]' : 'shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)]'
                }`}
              />
            </div>
            {errors.pitch && (
              <p className="text-[10.5px] text-rose-600 font-medium ml-3 mt-1.5">{errors.pitch}</p>
            )}
          </div>

          {/* Action Button: Publish Pitch to Arena Wall */}
          <div className="pt-2 flex items-center justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[280px] py-3.5 px-8 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black text-white font-bold text-sm rounded-2xl sm:rounded-full transition-all duration-150 ease-out flex items-center justify-center gap-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),2px_2px_6px_#c5ccd6,-2px_-2px_6px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] active:scale-[0.98] cursor-pointer border border-zinc-800/80 disabled:opacity-60 group"
            >
              <PaperPlaneTilt size={18} weight="bold" className="shrink-0 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================
          SECTION 2: ACCUMULATED EVENT PITCHES & VOTING (Browse & Vote)
          ======================================================== */}
      {activeSection === 'wall' && (
        <div className="!mt-8 sm:!mt-7 space-y-4 animate-in fade-in duration-150">
          {/* Quick Pitch Invite Card */}
          <div
            onClick={() => setActiveSection('pitch')}
            className="bg-[#ebedf2] border border-white/80 rounded-2xl p-3 sm:p-3.5 shadow-[inset_2px_2px_5px_#ffffff,inset_-2px_-2px_5px_#c5ccd6] flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-zinc-900 to-black text-white flex items-center justify-center shrink-0 shadow-sm">
                <Plus size={16} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 truncate">
                  Got a breakthrough concept?
                </p>
                <p className="text-[10.5px] text-zinc-500 font-medium truncate">
                  Pitch it to the venue wall and earn +10 PTS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F2F7FC] border border-white/80 text-xs font-bold text-zinc-700 shadow-[inset_1px_1px_2px_#c8d0db,inset_-1px_-1px_2px_#ffffff] group-hover:text-zinc-900 shrink-0">
              <span>Pitch</span>
              <ArrowRight size={13} weight="bold" />
            </div>
          </div>

          {/* Filter, Sort & Search Toolbar */}
          <div className="bg-[#ebedf2] border border-white/80 rounded-2xl p-2.5 sm:p-3 shadow-[inset_2px_2px_5px_#ffffff,inset_-2px_-2px_5px_#c5ccd6] space-y-2.5">
            {/* Search Input Well */}
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ideas, tech, or presenters..."
                className="w-full pl-9 pr-8 py-2 bg-[#F2F7FC] text-zinc-900 font-semibold text-xs rounded-xl border border-transparent shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] outline-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center hover:text-zinc-900 active:scale-90 cursor-pointer"
                >
                  <X size={11} weight="bold" />
                </button>
              )}
            </div>

            {/* Category Pills & Sort Segment */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              <div className="flex items-center gap-1.5 shrink-0">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 ${
                        isSelected
                          ? 'bg-zinc-900 text-white shadow-[2px_2px_4px_#c5ccd6] border border-zinc-800'
                          : 'bg-[#F2F7FC] text-zinc-600 hover:text-zinc-900 border border-white/80 shadow-[inset_1px_1px_2px_#c8d0db,inset_-1px_-1px_2px_#ffffff]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Sort Toggle (Top Voted vs Recent) */}
              <div className="flex items-center p-0.5 rounded-full bg-[#F2F7FC] border border-white/80 shadow-[inset_1px_1px_2px_#c8d0db,inset_-1px_-1px_2px_#ffffff] shrink-0">
                <button
                  type="button"
                  onClick={() => setSortBy('votes')}
                  title="Sort by most voted"
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    sortBy === 'votes'
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Top Voted
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('recent')}
                  title="Sort by newest"
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    sortBy === 'recent'
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Latest
                </button>
              </div>
            </div>
          </div>

          {/* Pitch Cards Feed */}
          {filteredPitches.length === 0 ? (
            <div className="bg-[#ebedf2] border border-white/80 rounded-[28px] p-8 text-center shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F2F7FC] border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center mx-auto text-zinc-400">
                <Lightbulb size={24} weight="duotone" />
              </div>
              <h3 className="font-arena text-sm font-bold text-zinc-900">
                NO PITCHES FOUND
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                No ideas match your filter or search query. Be the first to pitch one in this category!
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('pitch')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold shadow-[2px_2px_5px_#c5ccd6] active:scale-95 cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                <span>Submit a Pitch Idea</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredPitches.map((pitch) => {
                const hasVoted = votedIds.includes(pitch.id);
                const isCurrentUserPitch =
                  pitch.isMyPitch || pitch.guestId === guestId;

                return (
                  <div
                    key={pitch.id}
                    className="bg-[#ebedf2] border border-white/90 rounded-[28px] p-4 sm:p-5 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6] space-y-3 transition-all duration-200"
                  >
                    {/* Card Header Row: Presenter Info & Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full border border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                          <ArenaAvatar id={pitch.avatar || '1'} size="badge" className="w-full h-full" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-900 truncate">
                              {pitch.presenter}
                            </span>
                            {pitch.role && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20 shrink-0">
                                {pitch.role}
                              </span>
                            )}
                            {isCurrentUserPitch && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30 shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {pitch.timeAgo || 'Recently'}
                          </span>
                        </div>
                      </div>

                      {/* Category & Stage Pill */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="font-arena text-[9.5px] tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-white to-zinc-200 border border-white text-zinc-700 shadow-sm"
                          style={{ WebkitTextStroke: '0.3px' }}
                        >
                          {pitch.category}
                        </span>
                        <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F2F7FC] text-zinc-600 border border-white/80 shadow-[inset_1px_1px_2px_#c8d0db,inset_-1px_-1px_2px_#ffffff]">
                          {pitch.stage}
                        </span>
                      </div>
                    </div>

                    {/* Card Title */}
                    <h3
                      className="font-arena text-[14px] sm:text-[15px] font-black text-zinc-900 tracking-wide leading-snug"
                      style={{ WebkitTextStroke: '0.4px' }}
                    >
                      {pitch.title}
                    </h3>

                    {/* Card Description */}
                    <p className="text-[12.5px] sm:text-[13px] text-zinc-600 font-medium leading-relaxed">
                      {pitch.summary}
                    </p>

                    {/* Card Clinical Focus Tags */}
                    {pitch.tags && pitch.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {pitch.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Footer: Live Ballot / Vote Action */}
                    <div className="pt-2 border-t border-zinc-300/60 shadow-[0_1px_0_#ffffff] flex items-center justify-between gap-3">
                      {/* Submitter Handle / Status Capsule */}
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
                        <User size={13} weight="bold" />
                        <span className="truncate">{pitch.guestId || 'Arena Innovator'}</span>
                      </div>

                      {/* Tactile Vote / Ballot Button */}
                      <button
                        type="button"
                        onClick={() => handleVote(pitch.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-[0.92] ${
                          hasVoted
                            ? 'bg-gradient-to-b from-zinc-900 to-black text-white border border-zinc-800/80 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.22),inset_0_2px_4px_rgba(255,255,255,0.45),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff]'
                            : 'bg-[#ebedf2] text-zinc-700 hover:text-zinc-900 border border-white/90 shadow-[2px_2px_5px_#c8d0db,-2px_-2px_5px_#ffffff] hover:shadow-[1px_1px_3px_#c8d0db,-1px_-1px_3px_#ffffff]'
                        }`}
                      >
                        <Lightbulb
                          size={15}
                          weight={hasVoted ? 'fill' : 'bold'}
                          className={hasVoted ? 'text-amber-400' : 'text-zinc-500'}
                        />
                        <span>{hasVoted ? 'Ballot Cast' : 'Vote Pitch'}</span>
                        <span
                          className={`ml-0.5 px-2 py-0.5 rounded-full text-[10.5px] font-black ${
                            hasVoted
                              ? 'bg-white/20 text-white'
                              : 'bg-[#F2F7FC] text-zinc-800 border border-white/80 shadow-[inset_1px_1px_2px_#c8d0db,inset_-1px_-1px_2px_#ffffff]'
                          }`}
                        >
                          {pitch.votes}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IdeasPitchWallView;
