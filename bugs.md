**Problems**

1. **Taps are likely blocked (the big one).** `onPanningStart` fires on touch *down*, and `endGesture` only clears the flag 80ms after touch *up*. The browser’s `click` fires right after touch up, so `gestureRef` is still `true` and the tap gets swallowed. That was my spec’s mistake. Drop the library-event approach and compare pointer-down vs click position instead.
2. **Gem scaling steps and re-renders.** `gemScale` is a rounded state, so gems and the orb resize in visible 0.1 jumps while pinching, and every step re-renders the whole component. Use a CSS variable set directly on the DOM instead.
3. **Junk props.** `onTransform`, `onPinchStart` and `onPinchStop` aren’t real callbacks in the library. Only `onTransformed`, `onPinchingStart` and `onPinchingStop` exist.
4. **Beacon pulse and orb glow don’t counter-scale.** The counter-scale wrappers aren’t `relative`, so those absolute children stay unscaled and grow with the map.
5. **Duplicate `touchAction`.** It’s set on both the outer div and `wrapperStyle`. Keep the outer one only.
6. **Unused cruft.** `ArenaMapIcon`, `ArenaAvatar` and `totalPointsEarned` are unused.

Everything else (toolbar, `zoomToElement`, reset on `isActive`, `aspect-square`) looks correct.