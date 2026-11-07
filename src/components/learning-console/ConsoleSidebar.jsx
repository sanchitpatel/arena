import React from 'react';
import Logo from '../Logo';
import {
  Plus,
  House,
  Books,
  CheckCircle,
  ChartLineUp,
  ChatCircleDots,
  DotsThree,
  Lightning,
  ArrowRight,
  SignOut,
  X,
} from '../icons';
import { CONVERSATIONS } from './conversationsData';

export const ConsoleSidebar = ({
  activeChatId,
  onSelectChat,
  onNewChat,
  activeNav = 'home',
  onNavChange,
  onSignOut,
  onCloseMobile,
  onOpenUpgrade,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: House, href: '#home' },
    { id: 'subjects', label: 'Subjects', icon: Books, href: '#subjects' },
    { id: 'practice', label: 'Practice', icon: CheckCircle, href: '#practice' },
    { id: 'progress', label: 'Progress', icon: ChartLineUp, href: '#progress' },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-zinc-200/80 bg-[#FAFAFA] p-4 text-left select-none h-full">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2.5 group cursor-pointer" aria-label="AI Tutor — Home">
            <Logo dark className="h-8 w-8 !rounded-lg transition-transform group-hover:scale-105" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-[14px] font-bold tracking-tight text-zinc-900">
                AI Tutor
              </span>
              <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Intelligent Learning
              </span>
            </div>
          </a>

          {/* Close button for mobile drawer */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/60 transition-colors"
              aria-label="Close sidebar"
            >
              <X size={18} weight="bold" />
            </button>
          )}
        </div>

        {/* + New Chat Button */}
        <button
          type="button"
          onClick={() => {
            if (onNewChat) onNewChat();
            if (onCloseMobile) onCloseMobile();
          }}
          className="mt-6 flex w-full items-center justify-start gap-2.5 rounded-xl bg-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-black active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={16} weight="bold" />
          <span>New Chat</span>
        </button>

        {/* Primary Navigation */}
        <nav className="mt-3 space-y-0.5 text-[12.5px] font-medium text-zinc-600">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onNavChange) onNavChange(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-zinc-200/70 font-semibold text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
                }`}
              >
                <Icon size={17} weight={isActive ? 'bold' : 'regular'} className={isActive ? 'text-zinc-900' : 'text-zinc-500'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Recent Conversations */}
        <div className="mt-6">
          <div className="px-1 text-[11px] font-medium text-zinc-400">
            Recent Conversations
          </div>
          <div className="mt-2 space-y-1">
            {CONVERSATIONS.map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => {
                    onSelectChat(chat.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-zinc-200/80 font-semibold text-zinc-900 shadow-2xs'
                      : 'font-normal text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden pr-1">
                    <ChatCircleDots
                      size={16}
                      weight={isActive ? 'bold' : 'regular'}
                      className={isActive ? 'text-zinc-900 shrink-0' : 'text-zinc-400 shrink-0'}
                    />
                    <span className="truncate">{chat.title}</span>
                  </div>
                  {isActive && (
                    <span className="text-zinc-600 shrink-0 opacity-80 hover:opacity-100">
                      <DotsThree size={16} weight="bold" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Area: Upgrade to Pro Card & Sign Out */}
      <div className="mt-6 space-y-3 pt-2">
        {/* Upgrade to Pro Card */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs text-left">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 shadow-2xs border border-zinc-200/70 mb-2.5">
            <Lightning size={15} weight="fill" />
          </div>
          <div className="font-semibold text-xs text-zinc-900">Upgrade to Pro</div>
          <p className="mt-0.5 text-[10.5px] text-zinc-500 leading-snug">
            Unlock unlimited chats, advanced models and personalized plans.
          </p>
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-black py-1.5 px-3 text-[11px] font-semibold text-white shadow-xs hover:bg-zinc-800 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Upgrade Now</span>
            <ArrowRight size={12} weight="bold" />
          </button>
        </div>

        {/* User Sign Out button */}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/40 transition-colors cursor-pointer"
          >
            <span className="font-medium">Sign Out</span>
            <SignOut size={14} weight="bold" />
          </button>
        )}
      </div>
    </aside>
  );
};
