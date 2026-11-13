# 

**Bugs**

1. **Page scroll is trapped.** `touch-none` is always on, so any swipe starting on the map (most of the screen) can’t scroll the page down to the quest list. It should only block touch when zoomed in.
2. **Rapid taps on the toolbar get hijacked.** Touch listeners sit on the whole container, including the +/- buttons. Two quick taps on “+” trigger the double-tap zoom handler, which calls `preventDefault()` and kills the click.
3. **Invalid class `aspect-[1:1]`.** Tailwind needs `aspect-square` or `aspect-[1/1]`. As written, the map’s size comes from image content, not a real square, so layout and pan limits are unreliable.
4. **Pinch zooms around the center, not between your fingers.** It feels wrong and makes the map drift.
5. **Pan isn’t re-clamped on zoom out or the +/- buttons.** The map can end up partly off-screen. `maxOffset = (zoom-1)*180` is a hardcoded pixel value instead of being based on the real container size.
6. **Pinch to pan handoff is dead.** Lift one finger after pinching and the remaining finger does nothing until you re-touch.
7. **Double-tap timing is sloppy.** `lastTapTime` updates on every touchstart, so a drag followed by a quick touch zooms. Double-tapping a gem also fires zoom plus gem select.
8. **“Center on orb” math is wrong.** `(50 - x) * 2.2` is a magic number, unclamped and not tied to container size.
9. **`isDraggingRef` is used inside render for the `transition` style.** Refs don’t trigger renders, so the 0.25s transition randomly applies mid-gesture. That’s the laggy, rubber-band feel.
10. **Gems and orb scale with the map.** At 2.5x they’re huge and overlap.
11. **`setState` on every touchmove** re-renders the whole component, gems included. That’s bad on low-end phones.