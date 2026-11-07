import React, { useState, useRef, useEffect } from 'react';
import Logo from '../Logo';
import {
  User,
  TrendUp,
  Stack,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  DotsThree,
  CircleNotch,
} from '../icons';

export const ConsoleChatView = ({
  conversation,
  followUpMessages = [],
  isThinking = false,
}) => {
  const [liked, setLiked] = useState(null);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [followUpMessages, isThinking]);

  const handleCopy = () => {
    if (navigator.clipboard && conversation) {
      navigator.clipboard.writeText(
        `Concept Explanation: ${conversation.title}\nQuestion: ${conversation.userQuery}\nKey Insight: ${conversation.keyInsight?.props?.children || ''}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!conversation) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6 text-left">
      {/* ── 1. STUDENT INITIAL QUERY ── */}
      <div className="flex items-start gap-2.5 sm:gap-3 text-left">
        <div className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 shadow-2xs">
          <User size={15} weight="bold" />
        </div>
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-100/90 px-4 py-2.5 sm:py-3 shadow-2xs">
          <p className="font-sans text-xs sm:text-[13px] font-medium leading-relaxed text-zinc-800">
            {conversation.userQuery}
          </p>
          <span className="shrink-0 text-[10px] sm:text-[11px] text-zinc-500 self-end sm:self-auto select-none">
            {conversation.userTime}
          </span>
        </div>
      </div>

      {/* ── 2. AI TUTOR PRIMARY RESPONSE ── */}
      <div className="space-y-4">
        {/* Tutor Identity Lockup */}
        <div className="flex items-center gap-2.5">
          <Logo dark className="h-7 w-7 !rounded-lg shrink-0" />
          <span className="font-display font-bold text-xs sm:text-sm text-zinc-900">AI Tutor</span>
          <span className="rounded-full bg-zinc-100 border border-zinc-200/80 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600">
            Concept Explanation
          </span>
        </div>

        {/* Synthesis Text */}
        <p className="pl-0 sm:pl-9 font-sans text-xs sm:text-[13.5px] leading-relaxed text-zinc-700">
          {conversation.introText}
        </p>

        {/* Two Side-by-Side Math/Concept Comparison Cards */}
        <div className="pl-0 sm:pl-9 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1 */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 shadow-2xs">
                <TrendUp size={15} weight="bold" />
              </span>
              <span className="font-semibold text-xs text-zinc-900">{conversation.card1.title}</span>
            </div>

            {/* Formula Box */}
            <div className="my-3 rounded-xl border border-zinc-200/60 bg-zinc-50/80 px-3 py-3.5 text-center overflow-x-auto">
              {conversation.card1.formula}
            </div>

            <p className="text-[11px] leading-relaxed text-zinc-500">
              {conversation.card1.description}
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 shadow-2xs">
                <Stack size={15} weight="bold" />
              </span>
              <span className="font-semibold text-xs text-zinc-900">{conversation.card2.title}</span>
            </div>

            {/* Formula Box */}
            <div className="my-3 rounded-xl border border-zinc-200/60 bg-zinc-50/80 px-3 py-3.5 text-center overflow-x-auto">
              {conversation.card2.formula}
            </div>

            <p className="text-[11px] leading-relaxed text-zinc-500">
              {conversation.card2.description}
            </p>
          </div>
        </div>

        {/* Key Insight Callout Card */}
        <div className="ml-0 sm:ml-9 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200/70 text-zinc-800 shadow-2xs">
              <Lightbulb size={14} weight="bold" />
            </span>
            <span className="font-bold text-xs text-zinc-900">Key Insight</span>
          </div>
          <p className="text-[11.5px] sm:text-xs leading-relaxed text-zinc-600 pl-8">
            {conversation.keyInsight}
          </p>
        </div>

        {/* Tutor Action Bar (ThumbsUp, ThumbsDown, Copy, More) */}
        <div className="pl-0 sm:pl-9 flex items-center gap-2 pt-1 text-zinc-400 select-none">
          <button
            type="button"
            onClick={() => setLiked((v) => (v === 'up' ? null : 'up'))}
            className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer ${
              liked === 'up' ? 'text-black bg-zinc-100' : 'hover:text-zinc-800'
            }`}
            title="Helpful explanation"
          >
            <ThumbsUp size={15} weight={liked === 'up' ? 'fill' : 'regular'} />
          </button>
          <button
            type="button"
            onClick={() => setLiked((v) => (v === 'down' ? null : 'down'))}
            className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer ${
              liked === 'down' ? 'text-black bg-zinc-100' : 'hover:text-zinc-800'
            }`}
            title="Needs improvement"
          >
            <ThumbsDown size={15} weight={liked === 'down' ? 'fill' : 'regular'} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
            title="Copy explanation"
          >
            {copied ? <Check size={15} className="text-black" /> : <Copy size={15} />}
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
            title="More actions"
          >
            <DotsThree size={17} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── 3. FOLLOW-UP MESSAGES (DYNAMIC THREAD) ── */}
      {followUpMessages.map((msg, index) => {
        if (msg.role === 'user') {
          return (
            <div key={index} className="flex items-start gap-2.5 sm:gap-3 text-left pt-2">
              <div className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 shadow-2xs">
                <User size={15} weight="bold" />
              </div>
              <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-100/90 px-4 py-2.5 sm:py-3 shadow-2xs">
                <p className="font-sans text-xs sm:text-[13px] font-medium leading-relaxed text-zinc-800">
                  {msg.text}
                </p>
                <span className="shrink-0 text-[10px] sm:text-[11px] text-zinc-500 self-end sm:self-auto select-none">
                  {msg.time || 'Just now'}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div key={index} className="space-y-3 pt-2">
            <div className="flex items-center gap-2.5">
              <Logo dark className="h-7 w-7 !rounded-lg shrink-0" />
              <span className="font-display font-bold text-xs sm:text-sm text-zinc-900">AI Tutor</span>
              <span className="rounded-full bg-zinc-100 border border-zinc-200/80 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600">
                Socratic Insight
              </span>
            </div>
            <div className="pl-0 sm:pl-9 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs text-xs sm:text-[13px] leading-relaxed text-zinc-700">
              {msg.text}
            </div>
          </div>
        );
      })}

      {/* ── 4. THINKING STATE ── */}
      {isThinking && (
        <div className="flex items-center gap-3 pl-0 sm:pl-9 py-2 text-zinc-500 text-xs">
          <CircleNotch size={16} className="animate-spin text-zinc-700" />
          <span>AI Tutor is analyzing your question...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
