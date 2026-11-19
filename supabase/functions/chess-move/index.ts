// ==========================================================================
// SUPABASE EDGE FUNCTION: chess-move
// Authoritative Chess Move & Clock Validation Engine
// Runtime: Deno / TypeScript (Supabase Free Tier Native)
// ==========================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@1.0.0-beta.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MovePayload {
  game_id: string;
  player_id: string;
  from: string;
  to: string;
  promotion?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables on Edge Function");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: MovePayload = await req.json();
    const { game_id, player_id, from, to, promotion } = body;

    if (!game_id || !player_id || !from || !to) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: game_id, player_id, from, to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch current game state
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

    // 2. Turn Validation
    const isWhite = game.white_player_id === player_id;
    const isBlack = game.black_player_id === player_id;

    if (!isWhite && !isBlack) {
      return new Response(
        JSON.stringify({ error: "Caller is not a participant in this game" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((game.turn === "w" && !isWhite) || (game.turn === "b" && !isBlack)) {
      return new Response(
        JSON.stringify({ error: "Not your turn" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Authoritative Clock Deduction & Flag-Fall Check
    const now = new Date();
    const lastMoveAt = new Date(game.last_move_at);
    const elapsedMs = Math.max(0, now.getTime() - lastMoveAt.getTime());

    let whiteTimeLeftMs = game.white_time_left_ms;
    let blackTimeLeftMs = game.black_time_left_ms;

    if (game.turn === "w") {
      whiteTimeLeftMs -= elapsedMs;
      if (whiteTimeLeftMs <= 0) {
        // White flagged! Settle timeout win for Black
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
        // Black flagged! Settle timeout win for White
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

    // 4. Validate Move with chess.js
    const chess = new Chess(game.fen);
    let moveResult;
    try {
      moveResult = chess.move({
        from,
        to,
        promotion: promotion || "q",
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

    // 5. Evaluate End State
    let isGameOver = chess.isGameOver();
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

    // 6. Atomic DB Update via RPC or Direct Update
    const newFen = chess.fen();
    const newPgn = chess.pgn();
    const nextTurn = game.turn === "w" ? "b" : "w";

    const { data: rpcData, error: rpcError } = await supabase.rpc("submit_chess_move", {
      p_game_id: game_id,
      p_player_id: player_id,
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
        turn: nextTurn,
        white_time_left_ms: whiteTimeLeftMs,
        black_time_left_ms: blackTimeLeftMs,
        is_game_over: isGameOver,
        end_status: endStatus,
        winner_id: winnerId,
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
