### Confirmed good

The private `player_devices` table, device check on move and resign, advisory locks, atomic cancel, FEN-based ply counting, the `points_awarded` column, the sweeper, the heartbeat snapshot, the ply guard, and the queue-cancel and bot fixes.

### Fix before the event

**1. The master patch re-exposes `settle_chess_game`.** Step 2 revokes it, then step 6 drops and recreates it, and Supabase grants new functions to `anon` by default. So the new function is open again. Add this at the very end of the patch, then re-run the verification query. Only `settle_chess_game` should show `anon_can_run = false`.

sql

```sql
REVOKE EXECUTE ON FUNCTION public.settle_chess_game(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
```

**2. The master patch can break signup, and I can’t verify it.** It overwrites `claim_guest_player` with a version written without seeing yours. It assumes `guest_id_seq` and specific `players` columns, and it drops `players.device_id`.

- If you already ran it, test a brand-new guest and a returning guest in incognito right now.
- Search `src/` and your other SQL for `device_id`. Any client query like `.eq('device_id', …)`, any policy, or any other RPC that touches it will fail now.
- If the `DROP COLUMN` hit a dependency error, nothing after it ran.

**3. The loser sees “+100 Arena Points”.** The server stores the winner’s value in `points_awarded`, and `applyServerGame` shows it to both players. Fix:

js

```jsx
const base = g.points_awarded;const pointsAwarded =  typeof base === 'number' && base === 0 ? 0  : isDraw ? (base ?? 50)  : isWinner ? (base ?? 100)  : 10;
```

**4. Anyone can still forge a checkmate.** `submit_chess_move` trusts `p_is_game_over` and `p_end_status`. A crafted request with a valid-looking FEN at ply 4 or later and `'checkmate'` gives +100 every game. Since your anon key is public, this takes about five minutes with devtools.

The DB-native fix: only the player to move can report the end. A mated player has no reason to lie.

sql

```sql
CREATE OR REPLACE FUNCTION public.report_chess_game_end(  p_game_id UUID, p_player_id UUID, p_device_id TEXT, p_status TEXT)RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$DECLARE v_game public.chess_games%ROWTYPE; v_ply INT;BEGIN  IF NOT EXISTS (SELECT 1 FROM public.player_devices WHERE player_id = p_player_id AND device_id = p_device_id) THEN    RETURN jsonb_build_object('success', FALSE, 'message', 'Unauthorized');  END IF;  IF p_status NOT IN ('checkmate','stalemate') THEN    RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid status');  END IF;  PERFORM pg_advisory_xact_lock(hashtext(p_game_id::TEXT));  SELECT * INTO v_game FROM public.chess_games WHERE id = p_game_id FOR UPDATE;  IF NOT FOUND OR v_game.status <> 'in_progress' THEN    RETURN jsonb_build_object('success', FALSE, 'message', 'Game not active');  END IF;  IF (v_game.turn = 'w' AND v_game.white_player_id <> p_player_id)  OR (v_game.turn = 'b' AND v_game.black_player_id <> p_player_id) THEN    RETURN jsonb_build_object('success', FALSE, 'message', 'Only the player to move can report');  END IF;  v_ply := (split_part(v_game.fen,' ',6)::INT - 1)*2 + (split_part(v_game.fen,' ',2) = 'b')::INT;  IF (p_status = 'checkmate' AND v_ply < 4) OR (p_status = 'stalemate' AND v_ply < 20) THEN    RETURN jsonb_build_object('success', FALSE, 'message', 'Too early');  END IF;  RETURN public.settle_chess_game(p_game_id, p_status,    CASE WHEN p_status = 'checkmate'         THEN CASE WHEN v_game.turn = 'w' THEN v_game.black_player_id ELSE v_game.white_player_id END END,    p_status);END; $$;GRANT EXECUTE ON FUNCTION public.report_chess_game_end(UUID, UUID, TEXT, TEXT) TO anon, authenticated;
```

Then in `submit_chess_move`, delete the `p_is_game_over AND NOT (...)` check and the whole step 6, so it only commits the move and returns normally.

Client (`chessService.js`):

js

```jsx
export async function reportChessGameEnd(gameId, playerId, deviceId, status) {  const { data, error } = await supabase.rpc('report_chess_game_end', {    p_game_id: gameId, p_player_id: playerId, p_device_id: deviceId, p_status: status });  if (error) throw error;  if (data?.success === false) throw new Error(data.message);  return data;}
```

Client (`ChessView`): add `const reportedEndRef = useRef(false);` and reset it to `false` in `resetToLobby` and wherever a game starts. Then in `applyServerGame`, after the board-sync block:

js

```jsx
if (g.status === 'in_progress' && c.isGameOver() && !reportedEndRef.current    && c.turn() === (g.white_player_id === player?.id ? 'w' : 'b')) {  reportedEndRef.current = true;  reportChessGameEnd(g.id, player.id, getDeviceId(), c.isCheckmate() ? 'checkmate' : 'stalemate')    .catch(() => { reportedEndRef.current = false; }); // retried on the next heartbeat}
```

If the mated player’s app is closed, the clock runs out and the mating side still wins on time. The only edge case is a stalemate with the stalemated player offline, which becomes a win for the other side. That’s acceptable.

**This still can’t stop two colluding players** from “losing” on purpose. Add a cap, for example zero points after two rated games between the same pair. I can write that if you want it. Without one, treat leaderboard points as friendly rather than tamper-proof.

### Fix soon

**5. Queue expiry never fires.** The server never flips an old challenge to `'expired'` on its own, so `ch.status === 'expired'` is never true. After 2 minutes the player spins forever on an unmatchable row. Also, a poll still in flight after Cancel can create a ghost challenge. Replace the matching effect’s poll with:

js

```jsx
let alive = true;const startedAt = Date.now();// in handleChallengeUpdate, after the await:  if (!alive) return;const pollInterval = setInterval(async () => {  const ch = await getChessChallenge(activeChallengeId).catch(() => null);  if (!alive || !ch) return;  const stale = ch.status === 'expired' ||    (ch.status === 'pending' && Date.now() - startedAt > 105000);  if (stale) {    const res = await joinOrCreateMatchmaking(player?.id, 300).catch(() => null);    if (!alive) { if (res?.challenge_id) cancelChessMatchmaking(res.challenge_id, player.id).catch(() => {}); return; }    if (res?.action === 'waiting' && res.challenge_id) setActiveChallengeId(res.challenge_id);    else if (res?.game_id) handleChallengeUpdate({ status: 'accepted', game_id: res.game_id });    return;  }  handleChallengeUpdate(ch);}, 4000);return () => { alive = false; clearInterval(pollInterval); unsubscribe(); };
```

**6. `chess_schema.sql` and the master patch disagree.** The schema file still has the `players.device_id` fallback. If it’s re-run after the patch, every move fails with “column device_id does not exist”. It also lacks the `points_awarded` column and has the old `settle` and `rounds_played` logic. Treat the master patch as the source of truth and update or delete the schema file.

**7. `getChessGameSnapshot`.** You import it but I haven’t seen it. If `chessService.js` doesn’t export it, the whole bundle fails to build. It should be a plain `select('*')` on `chess_games`, with no joins, so it includes `winner_id`, `end_reason`, and `points_awarded`.

**8. `rounds_played` is no longer incremented.** The new `settle` dropped it. Add it back if any other screen reads it.