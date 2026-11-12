import React, { useState } from 'react';
import ArenaQRScanner from '../qr/ArenaQRScanner';
import PlayerQRBadge from '../qr/PlayerQRBadge';
import { X } from '../icons';

/**
 * ScannerView Component:
 * First-class page component for the Arena QR Scanner, matching the exact styling
 * and neumorphic card design of the modal pop-up, integrated into the dashboard app views.
 *
 * Symmetrically toggles between the Live Camera Scanner and the Attendee's PlayerQRBadge.
 */
export const ScannerView = ({ player, onNavigate, isActive = true }) => {
  const [viewMode, setViewMode] = useState('scanner'); // 'scanner' | 'badge'

  const handleClose = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('new-patient');
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  const handleScanSuccess = (scannedPlayer) => {
    console.log('[ScannerView] Player detected successfully:', scannedPlayer);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-4 select-none font-sans">
      {/* Outer Card: Replicates the exact double-bordered Neumorphic Frame */}
      <div className="relative w-full max-w-[310px] bg-[#ebedf2] rounded-[36px] p-3 sm:p-3 border-4 border-white shadow-[0_12px_32px_rgba(197,204,214,0.6)] animate-in zoom-in-95 duration-150 cursor-default">
        {/* Close Button positioned at the top-right corner OUT of the card frame */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute -top-3 -right-2.5 w-8 h-8 rounded-full bg-[#ebedf2] shadow-[2px_2px_6px_rgba(0,0,0,0.3),-1px_-1px_3px_#ffffff] flex items-center justify-center text-rose-500 hover:text-rose-700 border-2 border-white transition-all cursor-pointer z-30 active:scale-90"
          title="Back to Arena"
        >
          <X size={16} weight="bold" />
        </button>

        {/* Recessed Soft Slate Canvas Container */}
        <div className="relative bg-[#f0f2f5] rounded-[26px] p-3.5 sm:p-3.5 shadow-[inset_2px_2px_6px_#cbd2de,inset_-2px_-2px_6px_#ffffff]">
          {viewMode === 'scanner' ? (
            isActive ? (
              <ArenaQRScanner
                onClose={handleClose}
                onMyQrClick={() => setViewMode('badge')}
                onScanSuccess={handleScanSuccess}
              />
            ) : (
              <div className="w-52 h-52 flex flex-col items-center justify-center text-zinc-400 text-xs gap-2">
                <span>Scanner Paused</span>
              </div>
            )
          ) : (
            <PlayerQRBadge
              player={player}
              onScanClick={() => setViewMode('scanner')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerView;
