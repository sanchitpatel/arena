import React, { useState, useEffect } from 'react';
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

  // Automatically reset to camera scanner whenever attendee returns to the Scanner tab
  useEffect(() => {
    if (isActive) {
      setViewMode('scanner');
    }
  }, [isActive]);

  const handleScanSuccess = (scannedPlayer) => {
    setLastScanned(scannedPlayer);
  };

  return (
    <div className="w-full flex flex-col items-center pt-2 sm:pt-2 pb-8 select-none font-sans">
      {viewMode === 'scanner' ? (
        isActive ? (
          <ArenaQRScanner
            variant="page"
            showMyQrButton={true}
            onMyQrClick={() => setViewMode('badge')}
            onScanSuccess={handleScanSuccess}
          />
        ) : null
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
