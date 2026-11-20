import React, { useState } from 'react';
import {
  Clock,
  CaretUp,
  CaretDown,
  Lightning,
  Sun,
  Info,
  Users,
  SquaresFour,
} from '../icons';

/**
 * Pixel-perfect replica of Chess.com's "New Game" selection screen (Image 2).
 * Supports time control selection (Bullet, Blitz, Rapid, Daily), Rated toggle,
 * tab switching (New Game, Games, Players), and primary "Start Game" action.
 */
export function ChessNewGamePanel({ onStartGame, loading = false }) {
  const [activeTab, setActiveTab] = useState('new_game'); // 'new_game' | 'games' | 'players'
  const [selectedTime, setSelectedTime] = useState('10 min');
  const [isRated, setIsRated] = useState(true);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(true);
  const [variantDropdownOpen, setVariantDropdownOpen] = useState(false);
  const [showMoreControls, setShowMoreControls] = useState(false);

  // Time control presets matching Image 2
  const categories = [
    {
      id: 'bullet',
      title: 'Bullet',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="#e5a93c" className="shrink-0">
          <path d="M4 14l8-8 3 3-8 8-3-3zm11-9l2-2a2.8 2.8 0 014 4l-2 2-4-4zm-12 16a1 1 0 01-.3-.7l.8-3.8 3.7 3.7-3.8.8h-.4z" />
        </svg>
      ),
      options: ['1 min', '1 + 1', '2 + 1'],
    },
    {
      id: 'blitz',
      title: 'Blitz',
      icon: <Lightning size={17} weight="fill" className="text-[#f3b237] shrink-0" />,
      options: ['3 min', '3 + 2', '5 min'],
    },
    {
      id: 'rapid',
      title: 'Rapid',
      icon: <Clock size={17} weight="bold" className="text-[#81b64c] shrink-0" />,
      options: ['10 min', '10 + 5', '15 + 10'],
    },
    {
      id: 'daily',
      title: 'Daily',
      hasInfo: true,
      icon: <Sun size={17} weight="fill" className="text-[#e5a93c] shrink-0" />,
      options: ['1 day', '3 days', '7 days'],
    },
  ];

  const handleStart = () => {
    if (typeof onStartGame === 'function') {
      onStartGame({
        timeControl: selectedTime,
        isRated,
      });
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-[#262522] rounded-2xl shadow-2xl border border-[#363431] overflow-hidden select-none font-sans text-white">
      {/* 1. TOP TABS: New Game | Games | Players */}
      <div className="flex items-center bg-[#21201d] border-b border-[#363431]/80">
        <button
          type="button"
          onClick={() => setActiveTab('new_game')}
          className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors relative ${
            activeTab === 'new_game'
              ? 'text-white bg-[#262522] font-bold'
              : 'text-[#8b8985] hover:text-[#c3c2c0] font-medium'
          }`}
        >
          {/* Active top line accent */}
          {activeTab === 'new_game' && (
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-white rounded-b" />
          )}
          {/* Plus inside square icon */}
          <div className="w-5 h-5 rounded-md border-2 border-current flex items-center justify-center">
            <span className="text-xs font-black leading-none mb-0.5">+</span>
          </div>
          <span className="text-xs tracking-tight">New Game</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('games')}
          className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors relative ${
            activeTab === 'games'
              ? 'text-white bg-[#262522] font-bold'
              : 'text-[#8b8985] hover:text-[#c3c2c0] font-medium'
          }`}
        >
          {activeTab === 'games' && (
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-white rounded-b" />
          )}
          <SquaresFour size={20} weight="fill" />
          <span className="text-xs tracking-tight">Games</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('players')}
          className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors relative ${
            activeTab === 'players'
              ? 'text-white bg-[#262522] font-bold'
              : 'text-[#8b8985] hover:text-[#c3c2c0] font-medium'
          }`}
        >
          {activeTab === 'players' && (
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-white rounded-b" />
          )}
          <Users size={20} weight="fill" />
          <span className="text-xs tracking-tight">Players</span>
        </button>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="p-4 flex flex-col gap-3.5">
        {/* Dropdown 1: Active Time Control Banner */}
        <button
          type="button"
          onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#312e2b] hover:bg-[#383531] border border-[#3e3b37] transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <Clock size={22} weight="bold" className="text-[#81b64c]" />
            <span className="text-base font-extrabold text-white tracking-tight">
              {selectedTime} ({selectedTime.includes('day') ? 'Daily' : selectedTime.includes('10') || selectedTime.includes('15') ? 'Rapid' : selectedTime.includes('1 ') || selectedTime.includes('2 ') ? 'Bullet' : 'Blitz'})
            </span>
          </div>
          {timeDropdownOpen ? (
            <CaretUp size={16} weight="bold" className="text-[#c3c2c0]" />
          ) : (
            <CaretDown size={16} weight="bold" className="text-[#c3c2c0]" />
          )}
        </button>

        {/* Dropdown 2: Standard Variant Banner */}
        <button
          type="button"
          onClick={() => setVariantDropdownOpen(!variantDropdownOpen)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#312e2b] hover:bg-[#383531] border border-[#3e3b37] transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            {/* Authentic Chessboard Checker Icon */}
            <div className="w-5 h-5 rounded border border-[#8b8985] grid grid-cols-2 grid-rows-2 p-0.5 gap-0.5 bg-[#262522]">
              <div className="bg-white rounded-xs" />
              <div className="bg-transparent" />
              <div className="bg-transparent" />
              <div className="bg-white rounded-xs" />
            </div>
            <span className="text-base font-extrabold text-white tracking-tight">
              Standard
            </span>
          </div>
          {variantDropdownOpen ? (
            <CaretUp size={16} weight="bold" className="text-[#c3c2c0]" />
          ) : (
            <CaretDown size={16} weight="bold" className="text-[#c3c2c0]" />
          )}
        </button>

        {/* 3. RATED TOGGLE */}
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-base font-bold text-white tracking-tight">Rated</span>
          <button
            type="button"
            role="switch"
            aria-checked={isRated}
            onClick={() => setIsRated(!isRated)}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-out cursor-pointer relative ${
              isRated ? 'bg-[#81b64c]' : 'bg-[#3e3c38]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out ${
                isRated ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 4. TIME CONTROL CATEGORIES & BUTTONS (When dropdown is open) */}
        {timeDropdownOpen && (
          <div className="flex flex-col gap-3 pt-1 animate-in fade-in duration-150">
            {categories.map((cat) => (
              <div key={cat.id} className="flex flex-col gap-1.5">
                {/* Category Header */}
                <div className="flex items-center gap-1.5 px-0.5">
                  {cat.icon}
                  <span className="text-xs font-bold text-white tracking-tight">
                    {cat.title}
                  </span>
                  {cat.hasInfo && (
                    <Info size={13} weight="bold" className="text-[#8b8985] ml-0.5" />
                  )}
                </div>

                {/* 3-Column Time Buttons Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {cat.options.map((opt) => {
                    const isSelected = selectedTime === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelectedTime(opt)}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center active:scale-[0.96] ${
                          isSelected
                            ? 'bg-[#272522] text-white border-2 border-[#81b64c] shadow-[inset_0_0_8px_rgba(129,182,76,0.2)]'
                            : 'bg-[#363431] hover:bg-[#3e3b37] text-white border border-[#3e3b37]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* More Time Controls Link */}
            <button
              type="button"
              onClick={() => setShowMoreControls(!showMoreControls)}
              className="w-full flex items-center justify-center gap-1 text-[#c3c2c0] hover:text-white text-xs font-semibold py-1.5 transition-colors cursor-pointer mt-0.5"
            >
              <span>More Time Controls</span>
              <CaretDown
                size={13}
                weight="bold"
                className={`transition-transform duration-150 ${showMoreControls ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        )}

        {/* 5. START GAME PRIMARY CTA BUTTON */}
        <button
          type="button"
          disabled={loading}
          onClick={handleStart}
          className="w-full py-3.5 px-4 rounded-xl bg-[#81b64c] hover:bg-[#8ec257] active:bg-[#72a341] text-white font-black text-lg tracking-wide shadow-[0_4px_0_#537e28] active:shadow-[0_1px_0_#537e28] active:translate-y-[3px] transition-all duration-75 flex items-center justify-center cursor-pointer mt-1 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Finding Opponent...' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}
