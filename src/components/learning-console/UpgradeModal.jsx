import React from 'react';
import { X, Lightning, Check, ArrowRight } from '../icons';

export const UpgradeModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    'Unlimited adaptive AI tutoring conversations',
    'Advanced multi-modal mathematical reasoning',
    'Personalized spaced-repetition study schedules',
    'Full access to 50+ university STEM & Humanities subjects',
    'Export conversation notes & interactive flashcards',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-zinc-200/90 text-left animate-fadeIn">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <X size={18} weight="bold" />
        </button>

        {/* Icon & Title */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm mb-4">
          <Lightning size={24} weight="fill" />
        </div>
        <h3 className="font-display font-bold text-xl text-zinc-900 tracking-tight">
          Upgrade to AI Tutor Pro
        </h3>
        <p className="mt-1 text-xs text-zinc-500 font-normal leading-relaxed">
          Supercharge your learning with unconstrained cognitive models and personal study tracks.
        </p>

        {/* Feature List */}
        <div className="mt-5 space-y-2.5">
          {features.map((feat) => (
            <div key={feat} className="flex items-start gap-2.5 text-xs text-zinc-700">
              <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-black text-white mt-0.5">
                <Check size={11} weight="bold" />
              </span>
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* Pricing & CTA */}
        <div className="mt-6 pt-5 border-t border-zinc-100">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-xs font-semibold text-zinc-500">Pro Membership</span>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-2xl text-zinc-900">$12</span>
              <span className="text-xs text-zinc-400">/ month</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-5 rounded-full bg-black text-white text-xs font-semibold shadow-md hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
