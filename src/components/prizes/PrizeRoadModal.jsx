import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * PrizeSliderCard (formerly PrizeRoadModal):
 * Tactile Neumorphic Mobile Prize Road Slider Card.
 *
 * 1. Sheet Stacking: Positioned at z-[38] to emerge from behind the bottom tab bar (z-40)
 *    with rounded-t-[28px] sm:rounded-t-[32px] md:rounded-[28px].
 * 2. Reduced Height: Sized comfortably below the sticky top nav bar with generous clearance (never hides behind it).
 * 3. Focus Scrim: At z-[35], so top header and bottom nav at z-40 sit above it unblurred.
 * 4. Background Scroll Locking: While open, all touchmove and wheel bubbling outside the card is prevented.
 * 5. Auto-Dismiss on ANY External Button Click: Clicking any button/tab outside the slider automatically closes it.
 * 6. Dismissal Channels:
 *    - Click anywhere on the focus scrim.
 *    - Click any button outside the card (top nav, bottom nav, sidebar).
 *    - Pointer/touch swipe-down gesture anywhere on the card (> 40px with upward rubber-band resistance).
 *    - Downward mouse wheel scroll (> 20 delta).
 *    - Escape key press.
 * 7. Visual Framing: Purely frames the authentic 576:1024 Prize Road artwork with minimal padding (no extra headers, crosses, text, or icons).
 */
export const PrizeSliderCard = ({
  isOpen = false,
  onClose,
}) => {
  const [displayed, setDisplayed] = useState(isOpen);
  const [openState, setOpenState] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const sheetRef = useRef(null);

  // Entrance & Exit animation orchestration identical to QuestSliderCard
  useEffect(() => {
    if (isOpen) {
      setDisplayed(true);
      setDragOffset(0);
      setIsDragging(false);

      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => {
          setOpenState(true);
        });
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    } else {
      setOpenState(false);
      setDragOffset(0);
      setIsDragging(false);

      const timer = setTimeout(() => {
        setDisplayed(false);
      }, 310);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Smooth slide-down dismiss identical to QuestSliderCard
  const animateDismiss = () => {
    setOpenState(false);
    setDragOffset(0);
    setIsDragging(false);

    setTimeout(() => {
      onClose?.();
      setDisplayed(false);
    }, 310);
  };

  // Close on Escape key
  useEffect(() => {
    if (!displayed) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        animateDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayed]);

  // Prevent background and main screen scrolling while the slider is open (Identical to QuestSliderCard)
  useEffect(() => {
    if (!openState) return;

    const preventBackgroundScroll = (e) => {
      if (!sheetRef.current || !sheetRef.current.contains(e.target)) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventBackgroundScroll);
      document.removeEventListener('wheel', preventBackgroundScroll);
    };
  }, [openState]);

  // When slider is active, clicking ANY button outside the slider automatically closes it
  useEffect(() => {
    if (!openState) return;

    const handleGlobalClick = (e) => {
      const button = e.target.closest('button, [role="button"], a');
      if (button) {
        if (!sheetRef.current || !sheetRef.current.contains(button)) {
          animateDismiss();
        }
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [openState]);

  // --- Touch & Pointer Gesture Handling (Swipe to Dismiss) ---
  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;

    startYRef.current = e.clientY;
    currentYRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    const deltaY = e.clientY - startYRef.current;
    if (deltaY > 0) {
      currentYRef.current = deltaY;
      setDragOffset(deltaY);
    } else {
      const resisted = deltaY * 0.15;
      currentYRef.current = resisted;
      setDragOffset(resisted);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}

    if (currentYRef.current > 40) {
      animateDismiss();
    } else {
      setDragOffset(0);
    }
  };

  // Wheel gesture to dismiss on downward trackpad / mouse scroll
  const handleWheel = (e) => {
    if (e.deltaY > 20) {
      animateDismiss();
    }
  };

  if (!displayed || typeof document === 'undefined') return null;

  const cardStyle = isDragging
    ? {
        transform: `translateY(${dragOffset}px)`,
        transition: 'none',
        willChange: 'transform',
      }
    : {
        transform: openState ? 'translateY(0px)' : 'translateY(115%)',
        transition: openState
          ? 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 300ms cubic-bezier(0.36, 0.66, 0.04, 1)',
        willChange: 'transform',
      };

  return createPortal(
    <>
      {/* Full-Screen Focus Scrim (At z-[35], so top header and bottom nav at z-40 sit above it unblurred) */}
      <div
        onClick={animateDismiss}
        className={`fixed inset-0 z-[35] bg-black/15 backdrop-blur-[1px] touch-none select-none overscroll-none will-change-[opacity] ${
          openState
            ? 'opacity-100 pointer-events-auto cursor-pointer transition-opacity duration-300 ease-out'
            : 'opacity-0 pointer-events-none transition-opacity duration-280 ease-out'
        }`}
      />

      {/* Sheet Container: Positioned at z-[38] to emerge from behind the bottom tab bar (z-40) */}
      <div className="fixed bottom-0 left-0 right-0 z-[38] pointer-events-none flex justify-center px-1.5 sm:px-4">
        <div
          ref={sheetRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          style={cardStyle}
          className="pointer-events-auto w-auto max-w-[min(440px,calc(100vw-1.5rem))] bg-[#ebedf2] border border-white/90 rounded-t-[28px] sm:rounded-t-[32px] md:rounded-[28px] shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_-8px_32px_rgba(0,0,0,0.18)] p-2 sm:p-2.5 pb-20 md:pb-2.5 md:mb-4 select-none touch-none cursor-grab active:cursor-grabbing flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Main Prize Road Artwork Container: Pure visual framing with no custom text overlays */}
          <div
            style={{
              aspectRatio: '576 / 1024',
              height: 'min(615px, calc(100dvh - 7.5rem))',
            }}
            className="relative w-auto max-w-full rounded-[20px] sm:rounded-[22px] overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06)] select-none flex items-center justify-center"
          >
            {/* Authentic 3D Game Template Artwork Background (WebP + JPG fallback) */}
            <picture className="w-full h-full block pointer-events-none select-none">
              <source srcSet="/images/prize_road_template.webp" type="image/webp" />
              <img
                src="/images/prize_road_template.jpg"
                alt="Arena Prize Road"
                className="w-full h-full block object-fill pointer-events-none select-none"
                loading="eager"
                decoding="async"
              />
            </picture>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export const PrizeRoadModal = PrizeSliderCard;
export default PrizeSliderCard;
