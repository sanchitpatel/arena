import React from 'react';
import { X, Sparkle, CheckCircle, ArrowRight, Books } from '../icons';

export const StudyPlanModal = ({ isOpen, onClose, currentTopic = 'Vector Calculus' }) => {
  if (!isOpen) return null;

  const topics = [
    { name: 'Stokes’ Theorem in 3D', mastery: 88, status: 'In Review' },
    { name: 'Divergence Theorem', mastery: 74, status: 'Up Next' },
    { name: 'Line Integrals & Green’s Theorem', mastery: 95, status: 'Mastered' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200/90 text-left animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-2xs">
              <Sparkle size={16} weight="fill" />
            </span>
            <div>
              <h3 className="font-display font-bold text-base text-zinc-900 leading-tight">
                Adaptive Study Plan
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                Pacing calibrated to your cognitive retention curve
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Daily Progress Bar */}
          <div className="rounded-2xl bg-zinc-50 border border-zinc-200/70 p-4">
            <div className="flex justify-between text-xs font-semibold text-zinc-800 mb-1.5">
              <span>Weekly Concept Target</span>
              <span>4 / 5 Topics</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div className="h-full bg-black rounded-full" style={{ width: '80%' }} />
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Next scheduled spaced-repetition review for <strong className="text-zinc-900 font-semibold">{currentTopic}</strong> is tomorrow at 9:00 AM.
            </p>
          </div>

          {/* Module Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5 px-0.5">
              Topic Mastery
            </h4>
            <div className="space-y-2">
              {topics.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/70 bg-white hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle
                      size={17}
                      weight={t.mastery >= 90 ? 'fill' : 'bold'}
                      className={t.mastery >= 90 ? 'text-black' : 'text-zinc-400'}
                    />
                    <span className="text-xs font-medium text-zinc-800">{t.name}</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-zinc-900">
                    {t.mastery}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="mt-6 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-black text-white text-xs font-semibold shadow-xs hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Continue Practice</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
