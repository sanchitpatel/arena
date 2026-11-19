// ==========================================================================
// SUPABASE EDGE FUNCTION: chess-move
// Authoritative Chess Move & Clock Validation Engine
// Runtime: Deno / TypeScript (Deno.serve Native, Service Role Access)
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Chess } from "npm:chess.js@1.0.0-beta.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MovePayload {
  game_id: string;
  player_id: string;
  device_id: string;
  action?: "move" | "resign";
  from?: string;
  to?: string;
  promotion?: string;
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables on Edge Function");
    }

    // Connect with SERVICE_ROLE key so this function can invoke protected RPCs
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: MovePayload = await req.json();
    const { game_id, player_id, device_id, action = "move", from, to, promotion } = body;

    if (!game_id || !player_id || !device_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: game_id, player_id, device_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Identity Verification: Verify player_id strictly matches device_id in database
    const { data: playerDoc, error: playerErr } = await supabase
      .from("players")
      .select("id")
      .eq("id", player_id)
      .eq("device_id", device_id)
      .single();

    if (playerErr || !playerDoc) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Player credential mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch active game
    const { data: game, error: gameError } = await supabase
      .from("chess_games")
      .select("*")
      .eq("id", game_id)
      .single();

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: "Game not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (game.status !== "in_progress") {
      return new Response(
        JSON.stringify({ error: `Game is already finished (${game.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Participant verification
    const isWhite = game.white_player_id === player_id;
    const isBlack = game.black_player_id === player_id;

    if (!isWhite && !isBlack) {
      return new Response(
        JSON.stringify({ error: "Caller is not a participant in this game" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Handle Authoritative Resignation
    if (action === "resign") {
      const winnerId = isWhite ? game.black_player_id : game.white_player_id;
      const { data: settleResult, error: settleErr } = await supabase.rpc("settle_chess_game", {
        p_game_id: game_id,
        p_status: "resigned",
        p_winner_id: winnerId,
        p_end_reason: "resignation",
      });

      if (settleErr) throw settleErr;
      return new Response(
        JSON.stringify({ success: true, result: settleResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Turn Validation
    if ((game.turn === "w" && !isWhite) || (game.turn === "b" && !isBlack)) {
      return new Response(
        JSON.stringify({ error: "Not your turn" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!from || !to) {
      return new Response(
        JSON.stringify({ error: "Missing move squares: from, to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Authoritative Clock Deduction & Flag-Fall Check
    const now = new Date();
    const lastMoveAt = new Date(game.last_move_at);
    const elapsedMs = Math.max(0, now.getTime() - lastMoveAt.getTime());

    let whiteTimeLeftMs = game.white_time_left_ms;
    let blackTimeLeftMs = game.black_time_left_ms;

    if (game.turn === "w") {
      whiteTimeLeftMs -= elapsedMs;
      if (whiteTimeLeftMs <= 0) {
        const { data: settleResult } = await supabase.rpc("settle_chess_game", {
          p_game_id: game_id,
          p_status: "timeout",
          p_winner_id: game.black_player_id,
          p_end_reason: "flag_fall",
        });
        return new Response(
          JSON.stringify({ error: "Time expired. Flag fell.", result: settleResult }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      blackTimeLeftMs -= elapsedMs;
      if (blackTimeLeftMs <= 0) {
        const { data: settleResult } = await supabase.rpc("settle_chess_game", {
          p_game_id: game_id,
          p_status: "timeout",
          p_winner_id: game.white_player_id,
          p_end_reason: "flag_fall",
        });
        return new Response(
          JSON.stringify({ error: "Time expired. Flag fell.", result: settleResult }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 7. Load Complete PGN History (Guarantees threefold repetition, 50-move, and full game preservation)
    const chess = new Chess();
    if (game.pgn && game.pgn.trim().length > 0) {
      try {
        chess.loadPgn(game.pgn);
      } catch {
        chess.load(game.fen);
      }
    } else {
      chess.load(game.fen);
    }

    // 8. Validate Move with chess.js
    let moveResult;
    try {
      moveResult = chess.move({
        from,
        to,
        promotion: promotion || undefined,
      });
    } catch {
      moveResult = null;
    }

    if (!moveResult) {
      return new Response(
        JSON.stringify({ error: "Illegal move according to official chess rules" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Evaluate End State
    const isGameOver = chess.isGameOver();
    let endStatus: string | null = null;
    let winnerId: string | null = null;
    let endReason: string | null = null;

    if (isGameOver) {
      if (chess.isCheckmate()) {
        endStatus = "checkmate";
        winnerId = player_id;
        endReason = "checkmate";
      } else if (chess.isDraw()) {
        endStatus = "stalemate";
        winnerId = null;
        if (chess.isStalemate()) endReason = "stalemate";
        else if (chess.isThreefoldRepetition()) endReason = "repetition";
        else if (chess.isInsufficientMaterial()) endReason = "insufficient_material";
        else endReason = "50_move_rule";
      }
    }

    const newFen = chess.fen();
    const newPgn = chess.pgn();
    const nextTurn = game.turn === "w" ? "b" : "w";

    // 10. Commit to DB with concurrency expected_fen check
    const { data: rpcData, error: rpcError } = await supabase.rpc("submit_chess_move", {
      p_game_id: game_id,
      p_player_id: player_id,
      p_expected_fen: game.fen,
      p_new_fen: newFen,
      p_new_pgn: newPgn,
      p_is_game_over: isGameOver,
      p_end_status: endStatus,
      p_winner_id: winnerId,
      p_end_reason: endReason,
    });

    if (rpcError) {
      throw rpcError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        move: moveResult,
        fen: newFen,
        pgn: newPgn,
        turn: nextTurn,
        white_time_left_ms: whiteTimeLeftMs,
        black_time_left_ms: blackTimeLeftMs,
        is_game_over: isGameOver,
        end_status: endStatus,
        winner_id: winnerId,
        end_reason: endReason,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
