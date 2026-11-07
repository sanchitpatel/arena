import React, { useState } from 'react';
import { Plus, PaperPlaneTilt } from '../icons';

export const ConsoleInputBar = ({ onSendMessage, disabled = false }) => {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim() || disabled) return;
    onSendMessage(inputVal.trim());
    setInputVal('');
  };

  return (
    <div className="p-3.5 sm:p-5 pt-0 border-t border-zinc-100/80 bg-white">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center justify-between rounded-full border border-zinc-200/90 bg-white p-1.5 pl-3 sm:pl-3.5 shadow-xs transition-all focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-950/5"
      >
        {/* Attachment + button */}
        <button
          type="button"
          title="Add attachment / reference"
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-95 transition-colors cursor-pointer"
        >
          <Plus size={15} weight="bold" />
        </button>

        {/* Input Text Box */}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask a follow-up question..."
          disabled={disabled}
          className="w-full bg-transparent px-3 text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 outline-none min-w-0"
        />

        {/* Send Action Button */}
        <button
          type="submit"
          disabled={disabled || !inputVal.trim()}
          title="Send message"
          className="flex h-8.5 w-8.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-black text-white hover:bg-zinc-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
        >
          <PaperPlaneTilt size={14} weight="bold" className="-rotate-12 translate-x-px" />
        </button>
      </form>
    </div>
  );
};
