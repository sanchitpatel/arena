import React, { useState } from 'react';
import ArenaQRScanner from '../qr/ArenaQRScanner';
import PlayerQRBadge from '../qr/PlayerQRBadge';

/**
 * ScannerView Component:
 * Clean, direct display of the Arena Scanner white container.
 * Free of redundant nested frames, headers, or outer wrappers.
 */
export const ScannerView = ({ player, onNavigate, isActive = true }) => {
  const [viewMode, setViewMode] = useState('scanner'); // 'scanner' | 'badge'
  const [lastScanned, setLastScanned] = useState(null);

  const handleScanSuccess = (scannedPlayer) => {
    setLastScanned(scannedPlayer);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-130px)] py-4 select-none font-sans">
      {viewMode === 'scanner' ? (
        isActive ? (
          <ArenaQRScanner
            variant="page"
            showMyQrButton={true}
            onMyQrClick={() => setViewMode('badge')}
            onScanSuccess={handleScanSuccess}
          />
        ) : (
          <div className="w-64 h-64 flex flex-col items-center justify-center text-zinc-400 text-xs gap-2">
            <span>Scanner Paused</span>
          </div>
        )
      ) : (
        <PlayerQRBadge
          variant="page"
          player={player}
          showScanButton={true}
          onScanClick={() => setViewMode('scanner')}
        />
      )}
    </div>
  );
};

export default ScannerView;
