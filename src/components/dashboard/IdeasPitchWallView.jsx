import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Lightbulb,
  ThumbsUp,
  Plus,
  Sparkle,
  Crown,
  CurrencyCircleDollar,
  MagnifyingGlass,
  CheckCircle,
  TrendUp,
  ChatCircleDots,
  User,
  X,
  XCircle,
  WarningCircle,
  Clock,
  Check,
  ArrowClockwise,
} from '../icons';

const STORAGE_VOTES_KEY = 'arena_pitch_wall_votes';
const STORAGE_CUSTOM_PITCHES_KEY = 'arena_pitch_wall_custom_pitches';

const CATEGORIES = [
  'All',
  'AI & MedTech',
  'Clinical Ops',
  'Biotech',
  'Patient Exp',
];

const INITIAL_PITCHES = [
  {
    id: 'pitch-1',
    title: 'Autonomous EHR Scribe & Clinical Agent',
    category: 'AI & MedTech',
    presenter: 'Dr. Elena Vance',
    role: 'Lead AI Clinician',
    avatarLetter: 'E',
    summary: 'Ambient clinical listening that converts doctor-patient conversations into structured ICD-10 notes and real-time drug interaction alerts in under 2 seconds.',
    votes: 98,
    fundingAsk: '$25,000 Grant',
    stage: 'Live Beta',
    timeAgo: '12m ago',
    featured: true,
  },
  {
    id: 'pitch-2',
    title: 'Gamified PT with LiDAR Spatial Tracking',
    category: 'Patient Exp',
    presenter: 'Alex Chen',
    role: 'Biomedical Engineer',
    avatarLetter: 'A',
    summary: 'Using smartphone LiDAR to turn post-op orthopedic rehab exercises into an immersive rhythm mini-game with millimeter-accurate range-of-motion metrics.',
    votes: 84,
    fundingAsk: '$15,000 Grant',
    stage: 'Prototype',
    timeAgo: '28m ago',
    featured: true,
  },
  {
    id: 'pitch-3',
    title: 'Autonomous Drone Defibrillator Dispatch',
    category: 'Clinical Ops',
    presenter: 'Sarah Jenkins',
    role: 'Paramedic & Robotics Dev',
    avatarLetter: 'S',
    summary: 'Sub-4-minute urban drone deployment delivering AED units and voice-guided CPR instruction to cardiac arrest scenes before emergency ambulances arrive.',
    votes: 72,
    fundingAsk: '$50,000 Grant',
    stage: 'Pilot Ready',
    timeAgo: '1h ago',
    featured: false,
  },
  {
    id: 'pitch-4',
    title: 'Point-of-Care Blood Biomarker Spectrometer',
    category: 'Biotech',
    presenter: 'Marcus Thorne',
    role: 'Nanotech Researcher',
    avatarLetter: 'M',
    summary: 'Pocket spectrophotometer analyzing a single blood droplet for troponin, CRP, and creatinine in 90 seconds using microfluidic chips.',
    votes: 65,
    fundingAsk: '$30,000 Grant',
    stage: 'Lab Tested',
    timeAgo: '2h ago',
    featured: false,
  },
  {
    id: 'pitch-5',
    title: 'Haptic Feedback Surgical Training Simulator',
    category: 'AI & MedTech',
    presenter: 'Nina Patel',
    role: 'Robotic Surgery Fellow',
    avatarLetter: 'N',
    summary: 'Next-gen pneumatic force feedback gloves enabling residents to feel tissue resistance and vascular tension in VR surgical training scenarios.',
    votes: 51,
    fundingAsk: '$20,000 Grant',
    stage: 'Prototype',
    timeAgo: '3h ago',
    featured: false,
  },
  {
    id: 'pitch-6',
    title: 'Zero-Knowledge Health Records & Pass',
    category: 'Clinical Ops',
    presenter: 'Leo Tanaka',
    role: 'Cryptographic Systems',
    avatarLetter: 'L',
    summary: 'Cryptographically proven health credentialing allowing patients to share lab clearances without exposing any underlying medical history or PHI.',
    votes: 44,
    fundingAsk: '$10,000 Grant',
    stage: 'Concept',
    timeAgo: '4h ago',
    featured: false,
  },
];

export const IdeasPitchWallView = ({ player }) => {
  const [pitches, setPitches] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_PITCHES_KEY);
      if (stored) {
        const custom = JSON.parse(stored);
        return [...custom, ...INITIAL_PITCHES];
      }
    } catch {}
    return INITIAL_PITCHES;
  });

  const [votedIds, setVotedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_VOTES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // New Pitch Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('AI & MedTech');
  const [formPresenter, setFormPresenter] = useState(player?.name || 'Guest Innovator');
  const [formSummary, setFormSummary] = useState('');
  const [formFundingAsk, setFormFundingAsk] = useState('$10,000 Grant');
  const [formError, setFormError] = useState('');

  // Synchronize player name when player loads
  useEffect(() => {
    if (player?.name) {
      setFormPresenter(player.name);
    }
  }, [player?.name]);

  // Persist votes to localStorage
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
        title: 'Vote Removed',
        description: 'You revoked your ballot for this concept.',
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

  // Handle New Pitch Submission
  const handleSubmitPitch = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please enter a pitch title.');
      return;
    }
    if (!formSummary.trim() || formSummary.trim().length < 20) {
      setFormError('Please enter a description (at least 20 characters).');
      return;
    }

    const newPitch = {
      id: `pitch-custom-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory,
      presenter: formPresenter.trim() || 'Arena Innovator',
      role: 'Pitch Contestant',
      avatarLetter: (formPresenter.trim() || 'A')[0].toUpperCase(),
      summary: formSummary.trim(),
      votes: 1,
      fundingAsk: formFundingAsk.trim() || '$10,000 Grant',
      stage: 'Just Pitched',
      timeAgo: 'Just now',
      featured: false,
    };

    const updated = [newPitch, ...pitches];
    setPitches(updated);

    // Save custom pitches to storage
    try {
      const existingCustom = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_PITCHES_KEY) || '[]');
      localStorage.setItem(STORAGE_CUSTOM_PITCHES_KEY, JSON.stringify([newPitch, ...existingCustom]));
    } catch {}

    // Automatically count user's self-vote
    const newVoted = [...votedIds, newPitch.id];
    setVotedIds(newVoted);
    try {
      localStorage.setItem(STORAGE_VOTES_KEY, JSON.stringify(newVoted));
    } catch {}

    // Reset Form & Close
    setFormTitle('');
    setFormSummary('');
    setFormError('');
    setModalOpen(false);

    setToastMessage({
      type: 'success',
      title: 'Pitch Published!',
      description: 'Your idea is now live on the Arena Pitch Wall.',
    });
  };

  // Filtered Pitches
  const filteredPitches = useMemo(() => {
    return pitches.filter((pitch) => {
      const matchesCategory =
        selectedCategory === 'All' || pitch.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        pitch.title.toLowerCase().includes(q) ||
        pitch.summary.toLowerCase().includes(q) ||
        pitch.presenter.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [pitches, selectedCategory, searchQuery]);

  // Aggregate Stats
  const totalVotesCount = useMemo(() => {
    return pitches.reduce((acc, p) => acc + p.votes, 0);
  }, [pitches]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-12 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-3.5 sm:top-5 left-1/2 -translate-x-1/2 z-[100] w-[92%] sm:w-auto max-w-md bg-[#e6ebf2]/95 backdrop-blur-xl border border-white/90 rounded-2xl px-3.5 py-2.5 shadow-[8px_8px_24px_rgba(0,0,0,0.18),-4px_-4px_16px_#ffffff] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-700'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle size={18} weight="bold" />
              ) : (
                <Sparkle size={18} weight="bold" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900 leading-tight">
                {toastMessage.title}
              </h4>
              <p className="text-[11px] text-zinc-600 leading-tight mt-0.5">
                {toastMessage.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="w-6 h-6 rounded-md bg-[#e6ebf2] shadow-[1px_1px_3px_#c5ccd6,-1px_-1px_3px_#ffffff] flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors shrink-0 cursor-pointer"
          >
            <X size={13} weight="bold" />
          </button>
        </div>
      )}

      {/* Top Banner / Header */}
      <div className="pb-4 sm:pb-6 border-b border-zinc-300/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#e6ebf2] shadow-[4px_4px_8px_#c2c9d4,-4px_-4px_8px_#ffffff] border border-white/70 flex items-center justify-center text-amber-500 shrink-0">
              <Lightbulb size={26} className="sm:hidden" weight="duotone" />
              <Lightbulb size={30} className="hidden sm:block" weight="duotone" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 leading-tight">
                Ideas Pitch Wall
              </h2>
              <p className="hidden sm:block text-xs sm:text-sm text-zinc-500 mt-0.5">
                Pitch breakthrough concepts, vote on live attendee pitches, and fund mentor grants
              </p>
            </div>
          </div>

          {/* Action: Submit Pitch Button */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-zinc-900 to-black text-white text-xs sm:text-sm font-bold shadow-[2px_2px_6px_#c2c9d4,-2px_-2px_6px_#ffffff] hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0 border border-zinc-800"
          >
            <Plus size={16} weight="bold" />
            <span>Submit Pitch</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <div className="bg-[#e6ebf2] border border-white/80 rounded-2xl p-3 sm:p-4 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Live Pitches
            </span>
            <Sparkle size={18} className="text-amber-500 shrink-0" weight="duotone" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
            {pitches.length}
          </div>
          <span className="text-[10px] text-zinc-400">Attendee concepts</span>
        </div>

        <div className="bg-[#e6ebf2] border border-white/80 rounded-2xl p-3 sm:p-4 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Ballots Cast
            </span>
            <ThumbsUp size={18} className="text-indigo-600 shrink-0" weight="duotone" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
            {totalVotesCount}
          </div>
          <span className="text-[10px] text-zinc-400">Live community votes</span>
        </div>

        <div className="bg-[#e6ebf2] border border-white/80 rounded-2xl p-3 sm:p-4 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Grant Pool
            </span>
            <CurrencyCircleDollar size={20} className="text-emerald-600 shrink-0" weight="duotone" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
            $150,000
          </div>
          <span className="text-[10px] text-zinc-400">Mentor prize fund</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 text-white shadow-[2px_2px_5px_#c2c9d4,-2px_-2px_5px_#ffffff]'
                    : 'bg-[#e6ebf2] text-zinc-600 hover:text-zinc-900 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] border border-white/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts or presenters..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#e6ebf2] text-xs font-medium text-zinc-800 placeholder-zinc-400 border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
            >
              <X size={12} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* Pitches Grid */}
      {filteredPitches.length === 0 ? (
        <div className="bg-[#e6ebf2] border border-white/80 rounded-2xl p-8 sm:p-12 text-center shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6]">
          <div className="w-12 h-12 rounded-2xl bg-[#e6ebf2] shadow-[3px_3px_6px_#c2c9d4,-3px_-3px_6px_#ffffff] flex items-center justify-center mx-auto text-zinc-400 mb-3 border border-white/70">
            <Lightbulb size={24} weight="duotone" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800">No pitches found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            No concepts matched your filter or search query. Be the first to submit one in this category!
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold shadow-[2px_2px_5px_#c2c9d4] hover:bg-black cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Submit a Pitch Idea</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredPitches.map((pitch) => {
            const hasVoted = votedIds.includes(pitch.id);
            return (
              <div
                key={pitch.id}
                className="relative bg-[#e6ebf2] border border-white/80 rounded-2xl p-4 sm:p-5 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6] flex flex-col justify-between hover:shadow-[inset_2px_2px_5px_#ffffff,inset_-2px_-2px_5px_#c5ccd6] transition-all"
              >
                <div>
                  {/* Card Header: Category & Stage */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-white/70 text-zinc-700 shadow-[inset_1px_1px_2px_#ffffff,inset_-1px_-1px_2px_rgba(0,0,0,0.1)] border border-white/80">
                      {pitch.category}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60 shadow-[inset_1px_1px_2px_#ffffff]">
                      {pitch.fundingAsk}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 leading-snug">
                    {pitch.title}
                  </h3>

                  {/* Presenter / Submitter */}
                  <div className="flex items-center gap-2 mt-2 mb-2.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-600 text-white text-[10px] font-bold flex items-center justify-center shadow-[1px_1px_3px_rgba(0,0,0,0.2)]">
                      {pitch.avatarLetter}
                    </div>
                    <span className="text-xs font-semibold text-zinc-800">
                      {pitch.presenter}
                    </span>
                    <span className="text-[10px] text-zinc-400">•</span>
                    <span className="text-[10px] text-zinc-500">{pitch.timeAgo}</span>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {pitch.summary}
                  </p>
                </div>

                {/* Card Footer: Vote Button & Status */}
                <div className="mt-4 pt-3 border-t border-zinc-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider">
                      Status:
                    </span>
                    <span className="text-[11px] font-medium text-zinc-700">
                      {pitch.stage}
                    </span>
                  </div>

                  {/* Vote Button */}
                  <button
                    type="button"
                    onClick={() => handleVote(pitch.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                      hasVoted
                        ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.3),2px_2px_4px_#c2c9d4] border border-indigo-500'
                        : 'bg-[#e6ebf2] text-zinc-700 hover:text-indigo-600 shadow-[2px_2px_5px_#c2c9d4,-2px_-2px_5px_#ffffff] hover:shadow-[1px_1px_3px_#c2c9d4,-1px_-1px_3px_#ffffff] border border-white/80'
                    }`}
                  >
                    <ThumbsUp
                      size={15}
                      weight={hasVoted ? 'fill' : 'bold'}
                      className={hasVoted ? 'text-amber-300' : ''}
                    />
                    <span>{hasVoted ? 'Voted' : 'Vote'}</span>
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                        hasVoted
                          ? 'bg-black/20 text-white'
                          : 'bg-zinc-200/80 text-zinc-800'
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

      {/* Modal: Submit New Pitch */}
      {modalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-[100] w-screen h-screen bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#ebedf2] rounded-[28px] p-5 sm:p-6 border-4 border-white shadow-[0_12px_32px_rgba(0,0,0,0.25)] animate-in zoom-in-95 duration-150 cursor-default"
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute -top-3 -right-2.5 w-8 h-8 rounded-full bg-[#ebedf2] shadow-[2px_2px_6px_rgba(0,0,0,0.3),-1px_-1px_3px_#ffffff] flex items-center justify-center text-rose-500 hover:text-rose-700 border-2 border-white transition-all cursor-pointer z-30 active:scale-90"
              title="Close"
            >
              <X size={16} weight="bold" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-zinc-300/60">
              <span className="w-10 h-10 rounded-2xl bg-[#e6ebf2] shadow-[3px_3px_6px_#c2c9d4,-3px_-3px_6px_#ffffff] border border-white/80 flex items-center justify-center text-amber-500 shrink-0">
                <Lightbulb size={24} weight="duotone" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                  Pitch Your Breakthrough Concept
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Publish to the Arena Pitch Wall for live peer voting and mentor evaluation
                </p>
              </div>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <WarningCircle size={16} weight="bold" className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Submission Form */}
            <form onSubmit={handleSubmitPitch} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                  Concept Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Real-Time Pediatric Vitals Monitor"
                  className="w-full px-3 py-2 rounded-xl bg-[#e6ebf2] text-xs font-medium text-zinc-900 border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#e6ebf2] text-xs font-medium text-zinc-900 border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] focus:outline-none cursor-pointer"
                  >
                    <option value="AI & MedTech">AI & MedTech</option>
                    <option value="Clinical Ops">Clinical Ops</option>
                    <option value="Biotech">Biotech</option>
                    <option value="Patient Exp">Patient Exp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Grant / Ask
                  </label>
                  <input
                    type="text"
                    value={formFundingAsk}
                    onChange={(e) => setFormFundingAsk(e.target.value)}
                    placeholder="e.g. $15,000 Grant"
                    className="w-full px-3 py-2 rounded-xl bg-[#e6ebf2] text-xs font-medium text-zinc-900 border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                  Presenter Name / Team
                </label>
                <input
                  type="text"
                  value={formPresenter}
                  onChange={(e) => setFormPresenter(e.target.value)}
                  placeholder="Your Name or Team Handle"
                  className="w-full px-3 py-2 rounded-xl bg-[#e6ebf2] text-xs font-medium text-zinc-900 border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                  60-Second Elevator Pitch
                </label>
                <textarea
                  rows={3}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Explain the clinical problem, your technical solution, and why it matters in 2-3 sentences..."
                  className="w-full px-3 py-2 rounded-xl bg-[#e6ebf2] text-xs font-medium text-zinc-900 border border-white/80 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#e6ebf2] text-xs font-bold text-zinc-600 hover:text-zinc-900 shadow-[2px_2px_4px_#c2c9d4,-2px_-2px_4px_#ffffff] active:scale-95 border border-white/80 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-b from-zinc-900 to-black text-white text-xs font-bold shadow-[2px_2px_6px_#c2c9d4,-2px_-2px_6px_#ffffff] active:scale-95 hover:opacity-90 border border-zinc-800 cursor-pointer transition-all"
                >
                  <Plus size={15} weight="bold" />
                  <span>Publish Pitch</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default IdeasPitchWallView;
