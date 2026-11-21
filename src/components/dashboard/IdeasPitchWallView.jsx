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
  CaretUp,
  CaretDown,
} from '../icons';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { getPlayerId, getPlayerUuid, getOrbNumber, getStoredOrbNumber } from '../../utils/playerId';
import { normalizePitchTitle, normalizePitchDescription } from '../../utils/sanitize';
import {
  fetchPitches,
  submitNewPitch,
  togglePitchVote,
  subscribeToPitchWall,
} from '../../services/pitchWallService';

const STORAGE_VOTES_KEY = 'arena_pitch_wall_votes';
const STORAGE_CUSTOM_PITCHES_KEY = 'arena_pitch_wall_custom_pitches';

const STAGES = ['Concept', 'Prototype Demo', 'Live Beta'];

export const IdeasPitchWallView = ({ player }) => {
  // Current user identity resolution
  const guestId = player?.guest_id || getPlayerId() || null;
  const orbNumber = player?.orb_number || (guestId ? getOrbNumber(guestId) : null) || getStoredOrbNumber() || '?';
  const displayName = player?.name || guestId || 'Player';
  const avatar = player?.avatar || '1';

  // Active view section: 'pitch' (Submit Idea) | 'wall' (Explore & Vote)
  const [activeSection, setActiveSection] = useState('pitch');

  // Pitches state loaded live from PostgreSQL database
  const [pitches, setPitches] = useState([]);
  const [isLoadingPitches, setIsLoadingPitches] = useState(true);

  // Track voted pitch IDs
  const [votedIds, setVotedIds] = useState([]);

  // Fetch live pitches from PostgreSQL
  const loadLivePitches = useCallback(async () => {
    try {
      const myId = player?.id || getPlayerUuid();
      const res = await fetchPitches(myId);
      if (res?.success && Array.isArray(res.data)) {
        setPitches(res.data);
        const myVoted = res.data.filter((p) => p.has_voted).map((p) => p.id);
        setVotedIds(myVoted);
      }
    } catch (err) {
      console.warn('[IdeasPitchWallView] Error loading pitches:', err);
    } finally {
      setIsLoadingPitches(false);
    }
  }, [player?.id]);

  useEffect(() => {
    loadLivePitches();
    const unsub = subscribeToPitchWall(() => {
      loadLivePitches();
    });
    return () => unsub();
  }, [loadLivePitches]);

  // Maximum 3 submissions & maximum 3 votes constraints
  const myPitchesCount = useMemo(() => {
    const myId = player?.id || getPlayerUuid();
    return pitches.filter(
      (p) => p.isMyPitch || (myId && p.player_id === myId) || (guestId && p.guestId === guestId)
    ).length;
  }, [pitches, player?.id, guestId]);
  const canSubmit = myPitchesCount < 3;

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

  // Handle voting and un-voting live with PostgreSQL (Enforces max 3 votes limit)
  const handleVote = useCallback(async (pitchId) => {
    const myId = player?.id || getPlayerUuid();
    if (!myId) return;

    const isVoted = votedIds.includes(pitchId);

    // Enforce max 3 votes constraint when casting a new vote
    if (!isVoted && votedIds.length >= 3) {
      setToastMessage({
        type: 'warning',
        title: 'Vote Limit Reached (3/3)',
        description: 'You can vote for at most 3 ideas. Unvote a previous idea to vote for this one.',
      });
      return;
    }

    // Optimistic UI update
    if (isVoted) {
      setVotedIds((prev) => prev.filter((id) => id !== pitchId));
      setPitches((prev) =>
        prev.map((p) => (p.id === pitchId ? { ...p, votes: Math.max(0, (p.votes || 0) - 1), has_voted: false } : p))
      );
      setToastMessage({
        type: 'info',
        title: 'Ballot Revoked',
        description: 'You took back your vote for this concept.',
      });
    } else {
      setVotedIds((prev) => [...prev, pitchId]);
      setPitches((prev) =>
        prev.map((p) => (p.id === pitchId ? { ...p, votes: (p.votes || 0) + 1, has_voted: true } : p))
      );
      setToastMessage({
        type: 'success',
        title: '+10 Arena PTS Awarded to Author!',
        description: 'Ballot cast for this pitch demo! Thanks for voting.',
      });
    }

    try {
      const res = await togglePitchVote(pitchId, myId);
      if (res?.success && res.votes_count !== undefined) {
        setPitches((prev) =>
          prev.map((p) => (p.id === pitchId ? { ...p, votes: res.votes_count, has_voted: res.has_voted } : p))
        );
      }
    } catch (err) {
      console.error('[IdeasPitchWallView] Vote failed:', err);
      // Re-sync on error
      loadLivePitches();
    }
  }, [votedIds, player?.id, loadLivePitches]);

  // Handle new pitch submission live to PostgreSQL (awards +50 PTS)
  const handleSubmitPitch = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (myPitchesCount >= 3) {
      setToastMessage({
        type: 'warning',
        title: 'Submission Limit Reached (3/3)',
        description: 'You can submit at most 3 ideas for this event.',
      });
      return;
    }

    const myId = player?.id || getPlayerUuid();
    if (!myId) {
      setToastMessage({
        type: 'error',
        title: 'Player identity missing',
        description: 'Please refresh the page and try again.',
      });
      return;
    }

    setIsSubmitting(true);

    const cleanTitle = normalizePitchTitle(formTitle, 100).trim();
    const cleanPitch = normalizePitchDescription(formPitch, 500).trim();

    try {
      const res = await submitNewPitch({
        playerId: myId,
        title: cleanTitle,
        summary: cleanPitch,
        category: 'General',
        stage: 'Concept',
      });

      if (!res?.success) {
        throw new Error(res?.message || 'Failed to submit pitch');
      }

      // Reset form fields
      setFormTitle('');
      setFormPitch('');
      setErrors({});

      // Refresh live pitches
      await loadLivePitches();

      // Switch to wall view so user sees their new pitch live
      setActiveSection('wall');

      setToastMessage({
        type: 'success',
        title: 'Pitch Published to Wall! 🚀',
        description: '+50 Arena PTS earned! Your concept is live for peer ballots.',
      });
    } catch (err) {
      console.error('[IdeasPitchWallView] Submit error:', err);
      setToastMessage({
        type: 'error',
        title: 'Submission Failed',
        description: err.message || 'Could not save idea. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Accumulated pitches sorted strictly by votes count
  const sortedPitches = useMemo(() => {
    return [...pitches].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }, [pitches]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-5 pb-20 font-sans select-none">
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
          {/* Header indicator for submission limit (Max 3) */}
          <div className="flex items-center justify-between pb-1 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
              Your Submissions
            </span>
            <span
              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${
                myPitchesCount >= 3
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {myPitchesCount} / 3 ideas used
            </span>
          </div>

          {!canSubmit && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-center space-y-0.5">
              <p className="text-xs font-bold text-amber-900">Submission Limit Reached (3/3)</p>
              <p className="text-[11px] text-amber-700 font-medium">
                You have already submitted the maximum of 3 ideas for this event.
              </p>
            </div>
          )}

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
                disabled={!canSubmit || isSubmitting}
                placeholder="e.g. AI OPD Scribe, Smart ICU Alert..."
                value={formTitle}
                onChange={handleTitleChange}
                maxLength={100}
                style={{ outline: 'none' }}
                className={`w-full pl-11 pr-4 py-2.5 sm:py-3 bg-[#F2F7FC] rounded-2xl text-xs sm:text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)] transition-[box-shadow] duration-150 ease-out font-medium disabled:opacity-60 disabled:cursor-not-allowed ${
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
                disabled={!canSubmit || isSubmitting}
                maxLength={500}
                placeholder="Describe the clinical problem or idea in detail (what is the problem, your solution, and the impact)..."
                value={formPitch}
                onChange={handlePitchChange}
                style={{ outline: 'none' }}
                className={`w-full p-3.5 sm:p-4 bg-[#F2F7FC] rounded-2xl text-xs sm:text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(244,63,94,0.6)] font-medium leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed ${
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
              disabled={isSubmitting || !canSubmit}
              className="w-full sm:w-auto min-w-[280px] py-3.5 px-8 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black text-white font-bold text-sm rounded-2xl sm:rounded-full transition-all duration-150 ease-out flex items-center justify-center gap-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),2px_2px_6px_#c5ccd6,-2px_-2px_6px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] active:scale-[0.98] cursor-pointer border border-zinc-800/80 disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <PaperPlaneTilt size={18} weight="bold" className="shrink-0 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              <span>{isSubmitting ? 'Submitting...' : canSubmit ? 'Submit' : 'Limit Reached (3/3)'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================
          SECTION 2: ACCUMULATED EVENT PITCHES & VOTING (Browse & Vote)
          ======================================================== */}
      {activeSection === 'wall' && (
        <div className="!mt-6 sm:!mt-7 space-y-4 animate-in fade-in duration-150">
          {/* Section Header: Title, Subtitle & Votes Counter */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                Event Ideas ({sortedPitches.length})
              </h2>
              <p className="text-xs sm:text-[13px] text-zinc-500 font-medium mt-0.5">
                All submitted pitches for this event. Vote for the ideas you like.
              </p>
            </div>
            {/* Votes Counter Badge (Max 3) */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ebedf2] border border-white/90 shadow-[inset_1px_1px_2px_#ffffff,2px_2px_5px_#c8d0db] text-xs font-bold text-zinc-700 shrink-0">
              <span className="text-amber-500">★</span>
              <span>Votes: <strong className="text-zinc-900">{votedIds.length}</strong>/3</span>
            </div>
          </div>

          {/* Pitch Cards Feed */}
          {sortedPitches.length === 0 ? (
            <div className="bg-[#ebedf2] border border-white/80 rounded-[28px] p-8 text-center shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F2F7FC] border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center mx-auto text-zinc-400">
                <Lightbulb size={24} weight="duotone" />
              </div>
              <h3 className="font-arena text-sm font-bold text-zinc-900">
                NO PITCHES YET
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Be the first to pitch an idea to the event wall!
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('pitch')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold shadow-[2px_2px_5px_#c5ccd6] active:scale-95 cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                <span>Submit Idea</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-3.5">
              {sortedPitches.map((pitch) => {
                const hasVoted = votedIds.includes(pitch.id);
                const isCurrentUserPitch =
                  pitch.isMyPitch || pitch.guestId === guestId;

                // Collect distinct tags for the pitch
                const tagsList = Array.from(
                  new Set(
                    [
                      pitch.category,
                      pitch.stage && pitch.stage !== 'Concept' ? pitch.stage : null,
                      ...(pitch.tags || []),
                    ].filter(Boolean)
                  )
                );

                return (
                  <div
                    key={pitch.id}
                    className="bg-[#ebedf2] border border-white/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6] flex items-center justify-between gap-3 sm:gap-4 transition-all duration-200"
                  >
                    {/* Left: Presenter Avatar in Inset Soft Squircle */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F2F7FC] border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center shrink-0 overflow-hidden self-start sm:self-center">
                      <ArenaAvatar
                        id={pitch.avatar || '1'}
                        size="badge"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Middle: Title, Description & Tags */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm sm:text-[15px] font-bold text-zinc-900 tracking-tight leading-snug">
                          {pitch.title}
                        </h3>
                        {isCurrentUserPitch && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30 shrink-0">
                            You
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-[13px] text-zinc-600 font-medium leading-relaxed mt-1 line-clamp-2 sm:line-clamp-none">
                        {pitch.summary}
                      </p>

                      {tagsList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {tagsList.map((tag, idx) => (
                            <span
                              key={`${tag}-${idx}`}
                              className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F2F7FC] text-zinc-600 border border-white/80 shadow-[inset_1px_1px_2px_#c8d0db,inset_-1px_-1px_2px_#ffffff]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Vertical Upvote Capsule */}
                    <button
                      type="button"
                      onClick={() => handleVote(pitch.id)}
                      className={`w-14 sm:w-16 h-16 sm:h-18 rounded-2xl flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-150 shrink-0 active:scale-90 ${
                        hasVoted
                          ? 'bg-gradient-to-b from-zinc-900 to-black text-white border border-zinc-800/80 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.22),inset_0_2px_4px_rgba(255,255,255,0.45),2px_2px_5px_#c5ccd6,-2px_-2px_5px_#ffffff]'
                          : 'bg-[#ebedf2] border border-white/90 text-zinc-700 hover:text-zinc-900 shadow-[2px_2px_5px_#c8d0db,-2px_-2px_5px_#ffffff] hover:shadow-[1px_1px_3px_#c8d0db,-1px_-1px_3px_#ffffff]'
                      }`}
                      title={hasVoted ? 'Click to revoke your vote' : 'Click to vote for this idea'}
                    >
                      <CaretUp
                        size={18}
                        weight="bold"
                        className={`transition-colors ${hasVoted ? 'text-amber-400' : 'text-zinc-500'}`}
                      />
                      <span className="text-sm sm:text-base font-extrabold leading-none my-0.5">
                        {pitch.votes}
                      </span>
                      <span className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider opacity-75">
                        Votes
                      </span>
                    </button>
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
