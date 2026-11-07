import React, { useState } from 'react';
import { Stack, Sun, Export, BookmarkSimple, Sparkle, List, Check } from '../icons';

export const ConsoleHeader = ({
  subject = 'Calculus III',
  topic = 'Vector Calculus',
  onOpenMobileMenu,
  onOpenStudyPlan,
}) => {
  const [bookmarked, setBookmarked] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `AI Tutor Session — ${subject}: ${topic}\nURL: ${window.location.href}`
      );
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-zinc-200/80 bg-white px-4 py-3 sm:px-6 sm:py-3.5 select-none shrink-0">
      {/* Left: Mobile Drawer Trigger + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu */}
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open sidebar"
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <List size={20} weight="bold" />
          </button>
        )}

        {/* Breadcrumb Lockup */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
            <Stack size={15} weight="bold" />
          </div>
          <span className="font-semibold text-zinc-900 ml-0.5 sm:ml-1 truncate">
            {subject}
          </span>
          <span className="text-zinc-400 select-none">›</span>
          <span className="font-medium text-zinc-500 truncate">
            {topic}
          </span>
        </div>
      </div>

      {/* Right: Utility Action Icons & Study Plan Button */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Sun / Theme Button */}
        <button
          type="button"
          title="Light Mode (Active)"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <Sun size={17} weight="bold" />
        </button>

        {/* Export / Share Button */}
        <button
          type="button"
          onClick={handleExport}
          title={exported ? 'Copied link to clipboard!' : 'Export Conversation'}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
            exported ? 'text-black bg-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          {exported ? <Check size={16} weight="bold" /> : <Export size={16} weight="bold" />}
        </button>

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={() => setBookmarked((v) => !v)}
          title={bookmarked ? 'Remove Bookmark' : 'Bookmark Conversation'}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
            bookmarked ? 'text-black bg-zinc-100' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          <BookmarkSimple size={16} weight={bookmarked ? 'fill' : 'regular'} />
        </button>

        {/* Study Plan Pill Button */}
        <button
          type="button"
          onClick={onOpenStudyPlan}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer ml-1"
        >
          <span>Study Plan</span>
          <Sparkle size={12} weight="fill" className="text-zinc-600" />
        </button>
      </div>
    </header>
  );
};
