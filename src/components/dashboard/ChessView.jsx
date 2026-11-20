import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import {
  Trophy,
  Crown,
  Lightning,
  Clock,
  ArrowLeft,
  CircleNotch,
  CheckCircle,
  X,
  Swords,
  Sword,
  Play,
  ArrowClockwise,
  SpeakerHigh,
  SpeakerSlash,
} from '../icons';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { getDeviceId } from '../../utils/playerId';
import {
  joinOrCreateMatchmaking,
  cancelChessMatchmaking,
  getChessChallenge,
  getChessGame,
  getActiveOngoingGame,
  submitMove,
  claimChessTimeout,
  resignChessGame,
  subscribeToChessGame,
  subscribeToMatchmakingQueue,
} from '../../services/chessService';
import {
  initAudioUnlock,
  loadChessSounds,
  setChessAudioMuted,
  getChessAudioMuted,
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playVictorySound,
  playDefeatSound,
  triggerHaptic,
} from '../../utils/chessAudio';

// Piece value table for evaluation
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Move dot highlights: grey/white gradient for legal moves, rose-red for captures
const MOVE_DOT_NORMAL =
  'radial-gradient(circle, rgba(240, 243, 246, 0.85) 25%, rgba(180, 190, 200, 0.6) 28%, transparent 30%)';
const MOVE_DOT_CAPTURE =
  'radial-gradient(circle, rgba(244, 63, 94, 0.85) 30%, rgba(225, 29, 72, 0.6) 33%, transparent 35%)';
const SELECTED_SQUARE_BG = 'rgba(255, 255, 255, 0.22)';

function formatClock(ms) {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Isolated Memoized Clock Component
 * Ticks locally every 250ms based on server timestamp + client clock skew offset.
 * Prevents 10-per-second re-renders of the main Chessboard.
 */
const ChessClock = React.memo(function ChessClock({
  isRunning,
  baseTimeMs,
  lastMoveAt,
  serverOffsetMs = 0,
  onFlagFall,
}) {
  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (!isRunning) return Math.max(0, baseTimeMs);
    const now = Date.now() + serverOffsetMs;
    const elapsed = now - new Date(lastMoveAt).getTime();
    return Math.max(0, baseTimeMs - elapsed);
  });

  useEffect(() => {
    if (!isRunning) {
      setTimeRemaining(Math.max(0, baseTimeMs));
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now() + serverOffsetMs;
      const elapsed = now - new Date(lastMoveAt).getTime();
      const nextTime = Math.max(0, baseTimeMs - elapsed);
      setTimeRemaining(nextTime);
      if (nextTime === 0 && onFlagFall) {
        onFlagFall();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, baseTimeMs, lastMoveAt, serverOffsetMs, onFlagFall]);

  const isLowTime = timeRemaining > 0 && timeRemaining < 30000;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold tracking-wider transition-colors ${isLowTime
        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
        : isRunning
          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
          : 'bg-zinc-800/80 text-zinc-400'
        }`}
    >
      <Clock size={15} />
      <span>{formatClock(timeRemaining)}</span>
    </div>
  );
});

export function ChessView({ player, onBack }) {
  // Screen views: 'LOBBY' | 'MATCHING' | 'PLAYING' | 'GAME_OVER'
  const [viewState, setViewState] = useState('LOBBY');
  const [matchMode, setMatchMode] = useState(null); // 'pvp' | 'bot'
  const [gameId, setGameId] = useState(null);
  const [activeChallengeId, setActiveChallengeId] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [playerColor, setPlayerColor] = useState('w'); // 'w' | 'b'
  const [flipBoard, setFlipBoard] = useState(false);
  const [isMuted, setIsMuted] = useState(getChessAudioMuted);
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Chess Engine instance (chess.js)
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());

  // Clocks (Server baselines & phone skew compensation)
  const [whiteBaseMs, setWhiteBaseMs] = useState(300000);
  const [blackBaseMs, setBlackBaseMs] = useState(300000);
  const [lastMoveAt, setLastMoveAt] = useState(new Date().toISOString());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  // Tap-to-move highlights & promotion
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [squareStyles, setSquareStyles] = useState({});
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // Modals & End summary
  const [showResignModal, setShowResignModal] = useState(false);
  const [endSummary, setEndSummary] = useState(null);

  // Guard flags
  const hasClaimedTimeoutRef = useRef(false);
  const botTimeoutRef = useRef(null);
  const botFlaggedRef = useRef(false);
  const finishedRef = useRef(false);
  const lastInteractionRef = useRef({ time: 0, square: null });

  // Unlock audio on first touch & preload chess audio samples
  useEffect(() => {
    initAudioUnlock();
    loadChessSounds();
  }, []);

  // Helper to compare chess piece placement and active turn
  const samePositionAndTurn = (a, b) => {
    if (!a || !b) return false;
    return a.split(' ').slice(0, 2).join(' ') === b.split(' ').slice(0, 2).join(' ');
  };

  // --------------------------------------------------------------------------
  // CANONICAL SERVER STATE SYNCHRONIZER (applyServerGame)
  // Single point of truth for FEN/PGN, Clocks, Sounds, and Game-Over resolution
  // --------------------------------------------------------------------------
  const applyServerGame = useCallback(
    (g) => {
      if (!g) return;
      const c = chessRef.current;
      const prevCount = c.board().flat().filter(Boolean).length;
      const currentFen = c.fen();

      // Sync Board FEN/PGN if piece placement or turn changed
      if (!samePositionAndTurn(g.fen, currentFen)) {
        if (g.pgn && g.pgn.trim().length > 0) {
          try {
            c.loadPgn(g.pgn);
          } catch {
            c.load(g.fen);
          }
        } else {
          c.load(g.fen);
        }

        // Canonical server FEN fallback if PGN disagreed
        if (!samePositionAndTurn(g.fen, c.fen())) {
          c.load(g.fen);
        }

        setFen(c.fen());
        setSelectedSquare(null);
        setSquareStyles({});

        const newCount = c.board().flat().filter(Boolean).length;
        if (c.inCheck()) {
          playCheckSound();
        } else if (newCount < prevCount) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
      }

      // Sync Clocks & Measure Phone Clock Skew Offset
      if (typeof g.white_time_left_ms === 'number') {
        setWhiteBaseMs(g.white_time_left_ms);
      }
      if (typeof g.black_time_left_ms === 'number') {
        setBlackBaseMs(g.black_time_left_ms);
      }
      if (g.last_move_at) {
        setLastMoveAt(g.last_move_at);
        const offset = new Date(g.last_move_at).getTime() - Date.now();
        if (Math.abs(offset) < 7200000) {
          setServerOffsetMs(offset);
        }
      }

      setGameData((prev) => ({ ...(prev || {}), ...g }));

      // Authoritative Game Over Transition (Guarded with finishedRef)
      if (g.status && g.status !== 'in_progress' && !finishedRef.current) {
        finishedRef.current = true;
        if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
        setPendingPromotion(null);

        const isWinner = g.winner_id === player?.id;
        const isDraw = ['stalemate', 'draw_agreed'].includes(g.status);

        if (isWinner) playVictorySound();
        else if (!isDraw) playDefeatSound();

        const pointsAwarded = isWinner
          ? 100
          : isDraw
            ? 50
            : g.end_reason === 'early_resignation_no_points'
              ? 0
              : 10;

        setEndSummary({
          status: g.status,
          winner_id: g.winner_id,
          end_reason: g.end_reason,
          isWinner,
          isDraw,
          points: pointsAwarded,
        });
        setViewState('GAME_OVER');
      }
    },
    [player?.id]
  );

  // --------------------------------------------------------------------------
  // RECONNECT ON MOUNT: Check if player already has an ongoing live match
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!player?.id) return;
    let isSubscribed = true;

    async function checkOngoing() {
      const activeGame = await getActiveOngoingGame(player.id);
      if (activeGame && isSubscribed) {
        setGameId(activeGame.id);
        setMatchMode('pvp');
        setPlayerColor(activeGame.white_player_id === player.id ? 'w' : 'b');
        finishedRef.current = activeGame.status !== 'in_progress';
        hasClaimedTimeoutRef.current = false;
        applyServerGame(activeGame);
        if (activeGame.status === 'in_progress') {
          setViewState('PLAYING');
        }
      }
    }

    checkOngoing();
    return () => {
      isSubscribed = false;
    };
  }, [player?.id, applyServerGame]);

  // --------------------------------------------------------------------------
  // VISIBILITY CHANGE RESYNC: Refetch game when returning to foreground tab
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && gameId && matchMode === 'pvp') {
        try {
          const fresh = await getChessGame(gameId);
          if (fresh) applyServerGame(fresh);
        } catch (err) {
          console.warn('[ChessView] Background resync error:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [gameId, matchMode, applyServerGame]);

  // --------------------------------------------------------------------------
  // HEARTBEAT POLLING FALLBACK (5s): Self-heals dropped Realtime WebSocket packets
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (viewState !== 'PLAYING' || matchMode !== 'pvp' || !gameId) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await getChessGame(gameId);
        if (fresh) applyServerGame(fresh);
      } catch (err) {
        console.warn('[ChessView] Heartbeat polling note:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [viewState, matchMode, gameId, applyServerGame]);

  // Active Opponent
  const opponent = useMemo(() => {
    if (matchMode === 'bot') {
      return {
        name: 'Dr. DeepBlue (AI)',
        guest_id: 'AI-BOT',
        avatar: '5',
        total_score: 'Practice',
      };
    }
    if (!gameData) return null;
    return playerColor === 'w' ? gameData.black_player : gameData.white_player;
  }, [matchMode, gameData, playerColor]);

  const activeTurn = useMemo(() => {
    return chessRef.current.turn();
  }, [fen]);

  const isMyTurn = useMemo(() => {
    if (matchMode === 'bot') return activeTurn === playerColor;
    return activeTurn === playerColor && gameData?.status === 'in_progress';
  }, [activeTurn, playerColor, matchMode, gameData?.status]);

  // Captured pieces calculation
  const capturedPieces = useMemo(() => {
    const counts = { w: { p: 8, n: 2, b: 2, r: 2, q: 1 }, b: { p: 8, n: 2, b: 2, r: 2, q: 1 } };
    const board = chessRef.current.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== 'k') {
          if (counts[piece.color][piece.type] > 0) {
            counts[piece.color][piece.type]--;
          }
        }
      }
    }
    const whiteCaptured = [];
    const blackCaptured = [];
    let whiteScore = 0;
    let blackScore = 0;

    Object.entries(counts.b).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        whiteCaptured.push(type);
        whiteScore += PIECE_VALUES[type] || 0;
      }
    });
    Object.entries(counts.w).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        blackCaptured.push(type);
        blackScore += PIECE_VALUES[type] || 0;
      }
    });

    return {
      whiteCaptured,
      blackCaptured,
      advantage: whiteScore - blackScore,
    };
  }, [fen]);

  // --------------------------------------------------------------------------
  // MATCHMAKING QUEUE SUBSCRIPTION & POLLING (Wakes up Player 1 on match)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (viewState !== 'MATCHING' || !activeChallengeId) return;

    const handleChallengeUpdate = async (ch) => {
      if (!ch || ch.status !== 'accepted' || !ch.game_id) return;
      try {
        setGameId(ch.game_id);
        setPlayerColor(ch.challenger_id === player?.id ? 'w' : 'b');
        const initialGame = await getChessGame(ch.game_id);
        if (initialGame) {
          finishedRef.current = false;
          hasClaimedTimeoutRef.current = false;
          applyServerGame(initialGame);
          setViewState('PLAYING');
        }
      } catch (err) {
        console.error('[ChessView] Failed to transition to matched game:', err);
      }
    };

    // Immediate check right on entering MATCHING (covers 0-50ms gap)
    getChessChallenge(activeChallengeId).then((ch) => {
      if (ch) handleChallengeUpdate(ch);
    });

    // 4s polling fallback in case Realtime message drops
    const pollInterval = setInterval(() => {
      getChessChallenge(activeChallengeId).then((ch) => {
        if (ch) handleChallengeUpdate(ch);
      });
    }, 4000);

    const unsubscribe = subscribeToMatchmakingQueue(activeChallengeId, (matchedChallenge) => {
      handleChallengeUpdate(matchedChallenge);
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [viewState, activeChallengeId, player?.id, applyServerGame]);

  // --------------------------------------------------------------------------
  // REALTIME GAME UPDATES (PVP)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!gameId || matchMode !== 'pvp') return;

    const unsubscribe = subscribeToChessGame(gameId, (updatedGame) => {
      if (updatedGame) applyServerGame(updatedGame);
    });

    return () => unsubscribe();
  }, [gameId, matchMode, applyServerGame]);

  // --------------------------------------------------------------------------
  // MATCHMAKING & SESSION RESET
  // --------------------------------------------------------------------------
  const resetToLobby = useCallback(() => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    chessRef.current.reset();
    setFen(chessRef.current.fen());
    setGameId(null);
    setGameData(null);
    setActiveChallengeId(null);
    setMatchMode(null);
    setSelectedSquare(null);
    setSquareStyles({});
    setPendingPromotion(null);
    setEndSummary(null);
    setActionError('');
    setLoadingAction(false);
    setShowResignModal(false);
    setWhiteBaseMs(300000);
    setBlackBaseMs(300000);
    setLastMoveAt(new Date().toISOString());
    finishedRef.current = false;
    hasClaimedTimeoutRef.current = false;
    botFlaggedRef.current = false;
    setViewState('LOBBY');
  }, []);

  const startPvpMatch = async () => {
    if (!player?.id) return;
    setLoadingAction(true);
    setActionError('');
    setMatchMode('pvp');

    try {
      const res = await joinOrCreateMatchmaking(player.id, 300);
      if (res.action === 'matched' || res.action === 'reconnected') {
        setGameId(res.game_id);
        setPlayerColor(res.color || 'w');
        finishedRef.current = false;
        hasClaimedTimeoutRef.current = false;

        const initialGame = await getChessGame(res.game_id);
        if (initialGame) {
          applyServerGame(initialGame);
          setViewState('PLAYING');
        }
      } else {
        setActiveChallengeId(res.challenge_id);
        setViewState('MATCHING');
      }
    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Matchmaking failed. Try again.');
      setViewState('LOBBY');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelQueue = async () => {
    if (activeChallengeId && player?.id) {
      try {
        const ch = await getChessChallenge(activeChallengeId);
        if (ch && ch.status === 'accepted' && ch.game_id) {
          setGameId(ch.game_id);
          setPlayerColor(ch.challenger_id === player.id ? 'w' : 'b');
          const initialGame = await getChessGame(ch.game_id);
          if (initialGame) {
            finishedRef.current = false;
            hasClaimedTimeoutRef.current = false;
            applyServerGame(initialGame);
            setViewState('PLAYING');
            return;
          }
        }
        await cancelChessMatchmaking(activeChallengeId, player.id);
      } catch (err) {
        console.warn('Error cancelling queue:', err);
      }
    }
    resetToLobby();
  };

  const startBotMatch = () => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setMatchMode('bot');
    setGameId(`bot_${Date.now()}`);
    setPlayerColor('w');
    chessRef.current.reset();
    setFen(chessRef.current.fen());
    setWhiteBaseMs(300000);
    setBlackBaseMs(300000);
    setLastMoveAt(new Date().toISOString());
    finishedRef.current = false;
    hasClaimedTimeoutRef.current = false;
    botFlaggedRef.current = false;
    setSelectedSquare(null);
    setSquareStyles({});
    setPendingPromotion(null);
    setEndSummary(null);
    setActionError('');
    setViewState('PLAYING');
  };

  // --------------------------------------------------------------------------
  // IMPROVED 2-PLY BOT ENGINE (Min-Max with hanging piece protection)
  // --------------------------------------------------------------------------
  const handleBotGameOver = useCallback(
    (reason = 'normal') => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      if (finishedRef.current) return;
      finishedRef.current = true;

      const isCheckmate = chessRef.current.isCheckmate();
      let isWinner = false;
      let isDraw = false;
      let endStatus = 'checkmate';
      let endReason = 'checkmate';

      if (reason === 'player_timeout') {
        isWinner = false;
        isDraw = false;
        endStatus = 'timeout';
        endReason = 'flag_fall';
      } else if (reason === 'opponent_timeout') {
        isWinner = true;
        isDraw = false;
        endStatus = 'timeout';
        endReason = 'flag_fall';
      } else if (isCheckmate) {
        isWinner = chessRef.current.turn() !== playerColor;
        isDraw = false;
        endStatus = 'checkmate';
        endReason = 'checkmate';
      } else {
        isWinner = false;
        isDraw = true;
        endStatus = 'stalemate';
        endReason = 'draw';
      }

      if (isWinner) playVictorySound();
      else if (!isDraw) playDefeatSound();

      setEndSummary({
        status: endStatus,
        winner_id: isWinner ? player?.id : isDraw ? null : 'bot',
        end_reason: endReason,
        isWinner,
        isDraw,
        points: 0, // Clear: 0 Arena points for bot practice
      });
      setViewState('GAME_OVER');
    },
    [playerColor, player?.id]
  );

  const executeBotMove = useCallback(() => {
    if (chessRef.current.isGameOver() || viewState !== 'PLAYING') return;

    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    botTimeoutRef.current = setTimeout(() => {
      if (chessRef.current.turn() === playerColor || chessRef.current.isGameOver()) return;

      const legalMoves = chessRef.current.moves({ verbose: true });
      if (legalMoves.length === 0) return;

      let bestScore = -Infinity;
      const topMoves = [];

      for (const m of legalMoves) {
        chessRef.current.move(m);
        let score = 0;

        if (m.captured) score += (PIECE_VALUES[m.captured] || 1) * 10;
        if (m.promotion === 'q') score += 90; // Task 10: Prefer Queen promotion
        if (chessRef.current.inCheck()) score += 5;
        if (chessRef.current.isCheckmate()) score += 1000;

        // 2-ply check: evaluate opponent's best reply to avoid hanging pieces
        if (!chessRef.current.isGameOver()) {
          const replies = chessRef.current.moves({ verbose: true });
          let maxReplyLoss = 0;
          for (const rep of replies) {
            if (rep.captured) {
              const loss = (PIECE_VALUES[rep.captured] || 1) * 10;
              if (loss > maxReplyLoss) maxReplyLoss = loss;
            }
          }
          score -= maxReplyLoss;
        }

        chessRef.current.undo();

        if (score > bestScore) {
          bestScore = score;
          topMoves.length = 0;
          topMoves.push(m);
        } else if (score === bestScore) {
          topMoves.push(m);
        }
      }

      const chosenMove = topMoves[Math.floor(Math.random() * topMoves.length)] || legalMoves[0];
      const botMoveNow = Date.now();
      const elapsedTurn = Math.max(0, botMoveNow - new Date(lastMoveAt).getTime());
      if (playerColor === 'w') {
        setBlackBaseMs((prev) => Math.max(0, prev - elapsedTurn));
      } else {
        setWhiteBaseMs((prev) => Math.max(0, prev - elapsedTurn));
      }

      const result = chessRef.current.move(chosenMove);

      if (result) {
        setFen(chessRef.current.fen());
        setLastMoveAt(new Date(botMoveNow).toISOString());

        if (chessRef.current.inCheck()) playCheckSound();
        else if (result.captured) playCaptureSound();
        else playMoveSound();

        if (chessRef.current.isGameOver()) {
          handleBotGameOver();
        }
      }
    }, 450);
  }, [viewState, playerColor, lastMoveAt, handleBotGameOver]);

  // Clean up bot timers on unmount
  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, []);

  // --------------------------------------------------------------------------
  // SYNCHRONOUS MOVE EXECUTION WITH LOCAL CLOCK CONTINUITY & OPTIMISTIC ROLLBACK
  // --------------------------------------------------------------------------
  const makeMove = useCallback(
    (from, to, promotion = null) => {
      if (!isMyTurn) return false;

      // 1. Verify move legality & check for promotion
      const legalMoves = chessRef.current.moves({ square: from, verbose: true });
      const targetMove = legalMoves.find((m) => m.to === to);
      if (!targetMove) return false;

      if (targetMove.promotion && !promotion) {
        setPendingPromotion({ from, to });
        return false;
      }

      const previousFen = chessRef.current.fen();
      const previousPgn = chessRef.current.pgn();
      const prevWhiteBase = whiteBaseMs;
      const prevBlackBase = blackBaseMs;
      const prevLastMoveAt = lastMoveAt;

      let moveResult;
      try {
        moveResult = chessRef.current.move({ from, to, promotion: promotion || undefined });
      } catch {
        moveResult = null;
      }

      if (!moveResult) return false;

      // Deduct elapsed turn time locally immediately to eliminate clock jump
      const nowMs = Date.now();
      const effectiveNow = nowMs + serverOffsetMs;
      const elapsedTurnMs = Math.max(0, effectiveNow - new Date(lastMoveAt).getTime());
      if (playerColor === 'w') {
        setWhiteBaseMs((prev) => Math.max(0, prev - elapsedTurnMs));
      } else {
        setBlackBaseMs((prev) => Math.max(0, prev - elapsedTurnMs));
      }
      setLastMoveAt(new Date(effectiveNow).toISOString());

      // Apply locally synchronously
      setFen(chessRef.current.fen());
      setSelectedSquare(null);
      setSquareStyles({});

      if (chessRef.current.inCheck()) playCheckSound();
      else if (moveResult.captured) playCaptureSound();
      else playMoveSound();

      // Bot Mode
      if (matchMode === 'bot') {
        if (chessRef.current.isGameOver()) {
          handleBotGameOver();
        } else {
          executeBotMove();
        }
        return true;
      }

      // PVP Mode: Direct database submission with rollback on failure
      const deviceId = getDeviceId();
      const newFen = chessRef.current.fen();
      const newPgn = chessRef.current.pgn();
      const isGameOver = chessRef.current.isGameOver();
      let endStatus = null;
      let winnerId = null;
      let endReason = null;

      if (isGameOver) {
        if (chessRef.current.isCheckmate()) {
          endStatus = 'checkmate';
          winnerId = player.id;
          endReason = 'checkmate';
        } else {
          endStatus = 'stalemate';
          endReason = 'draw';
        }
      }

      submitMove({
        gameId,
        playerId: player.id,
        deviceId,
        newFen,
        newPgn,
        isGameOver,
        endStatus,
        winnerId,
        endReason,
      }).catch((err) => {
        console.error('Server move submission failed, rolling back board:', err);
        // Rollback on rejection: restore PGN, clocks, and lastMoveAt
        try {
          if (previousPgn && previousPgn.trim().length > 0) {
            chessRef.current.loadPgn(previousPgn);
          } else {
            chessRef.current.load(previousFen);
          }
        } catch {
          chessRef.current.load(previousFen);
        }
        setFen(chessRef.current.fen());
        setWhiteBaseMs(prevWhiteBase);
        setBlackBaseMs(prevBlackBase);
        setLastMoveAt(prevLastMoveAt);
        setSelectedSquare(null);
        setSquareStyles({});
        setActionError(err.message || 'Illegal move rejected by server.');
        setTimeout(() => setActionError(''), 3500);
      });

      return true;
    },
    [
      isMyTurn,
      matchMode,
      gameId,
      player?.id,
      playerColor,
      lastMoveAt,
      serverOffsetMs,
      whiteBaseMs,
      blackBaseMs,
      executeBotMove,
      handleBotGameOver,
    ]
  );

  // --------------------------------------------------------------------------
  // SYNCHRONOUS PIECE DROP (react-chessboard expects boolean)
  // --------------------------------------------------------------------------
  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      setSelectedSquare(null);
      setSquareStyles({});
      if (!targetSquare || !isMyTurn) return false;
      return makeMove(sourceSquare, targetSquare);
    },
    [isMyTurn, makeMove]
  );

  // --------------------------------------------------------------------------
  // DRAG LIFECYCLE HANDLERS (Highlights valid moves while dragging)
  // --------------------------------------------------------------------------
  const handlePieceDrag = useCallback(
    ({ square }) => {
      if (!square || !isMyTurn) return;
      setSelectedSquare(square);
      const moves = chessRef.current.moves({ square, verbose: true });
      const newStyles = {
        [square]: { backgroundColor: SELECTED_SQUARE_BG },
      };
      moves.forEach((m) => {
        newStyles[m.to] = {
          background: m.captured ? MOVE_DOT_CAPTURE : MOVE_DOT_NORMAL,
          borderRadius: '50%',
        };
      });
      setSquareStyles(newStyles);
    },
    [isMyTurn]
  );

  const handlePieceDragCancel = useCallback(() => {
    setSelectedSquare(null);
    setSquareStyles({});
  }, []);

  const canDragPiece = useCallback(
    ({ piece }) => {
      if (!isMyTurn) return false;
      const pieceColor = piece?.pieceType?.[0];
      return pieceColor === playerColor;
    },
    [isMyTurn, playerColor]
  );

  // --------------------------------------------------------------------------
  // TAP-TO-MOVE HANDLER (Fluid 1-Tap Activation & Clean Deselection)
  // --------------------------------------------------------------------------
  const handleSquareClick = useCallback(
    ({ square }) => {
      if (!isMyTurn || !square) return;

      const now = performance.now();
      if (
        lastInteractionRef.current.square === square &&
        now - lastInteractionRef.current.time < 120
      ) {
        return; // Suppress duplicate event from piece + square bubbling
      }
      lastInteractionRef.current = { time: now, square };

      const clickedPiece = chessRef.current.get(square);

      // Case 1: Tapping one of own pieces
      if (clickedPiece && clickedPiece.color === playerColor) {
        // If tapping the already selected piece: toggle off
        if (selectedSquare === square) {
          setSelectedSquare(null);
          setSquareStyles({});
          return;
        }

        // Immediately select this piece and calculate legal moves
        setSelectedSquare(square);
        const moves = chessRef.current.moves({ square, verbose: true });
        const newStyles = {
          [square]: { backgroundColor: SELECTED_SQUARE_BG },
        };
        moves.forEach((m) => {
          newStyles[m.to] = {
            background: m.captured ? MOVE_DOT_CAPTURE : MOVE_DOT_NORMAL,
            borderRadius: '50%',
          };
        });
        setSquareStyles(newStyles);
        triggerHaptic(10);
        return;
      }

      // Case 2: A piece is already selected, and user taps a destination square
      if (selectedSquare) {
        const moves = chessRef.current.moves({ square: selectedSquare, verbose: true });
        const isLegal = moves.some((m) => m.to === square);

        if (isLegal) {
          makeMove(selectedSquare, square);
        } else {
          // If tapped an illegal square: deselect immediately so piece never freezes or gets trapped
          setSelectedSquare(null);
          setSquareStyles({});
        }
      }
    },
    [isMyTurn, selectedSquare, playerColor, makeMove]
  );

  // --------------------------------------------------------------------------
  // RESIGNATION & TIMEOUT HANDLERS
  // --------------------------------------------------------------------------
  const handleResign = async () => {
    setShowResignModal(false);
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);

    if (matchMode === 'bot') {
      playDefeatSound();
      setEndSummary({
        status: 'resigned',
        winner_id: 'bot',
        end_reason: 'resignation',
        isWinner: false,
        isDraw: false,
        points: 0,
      });
      setViewState('GAME_OVER');
      return;
    }

    if (gameId && player?.id) {
      setLoadingAction(true);
      try {
        const deviceId = getDeviceId();
        await resignChessGame(gameId, player.id, deviceId);
        const fresh = await getChessGame(gameId);
        if (fresh) {
          applyServerGame(fresh);
        }
      } catch (err) {
        console.error('Failed to resign:', err);
        setActionError(err.message || 'Failed to submit resignation.');
        setTimeout(() => setActionError(''), 3500);
      } finally {
        setLoadingAction(false);
      }
    }
  };

  const handleOpponentFlagFall = useCallback(() => {
    if (hasClaimedTimeoutRef.current) return;
    if (matchMode === 'bot') {
      if (botFlaggedRef.current) return;
      botFlaggedRef.current = true;
      handleBotGameOver('opponent_timeout');
      return;
    }
    if (gameId && player?.id) {
      hasClaimedTimeoutRef.current = true;
      claimChessTimeout(gameId, player.id)
        .then((res) => {
          if (!res || !res.success) {
            hasClaimedTimeoutRef.current = false;
          }
        })
        .catch((err) => {
          console.warn('Timeout claim note:', err);
          hasClaimedTimeoutRef.current = false;
        });
    }
  }, [matchMode, gameId, player?.id, handleBotGameOver]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setChessAudioMuted(next);
  };

  const boardOrientation = useMemo(() => {
    if (flipBoard) return playerColor === 'w' ? 'black' : 'white';
    return playerColor === 'w' ? 'white' : 'black';
  }, [flipBoard, playerColor]);

  // ==========================================================================
  // RENDER: LOBBY & MATCHMAKING
  // ==========================================================================
  if (viewState === 'LOBBY' || viewState === 'MATCHING') {
    return (
      <div className="w-full max-w-lg mx-auto p-4 flex flex-col gap-6 animate-fade-in select-none">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Arena</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 active:scale-95"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-500/30 text-sky-400 text-xs font-semibold tracking-wider">
              <Swords size={16} />
              <span>CHESS ARENA</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 flex flex-col items-center text-center gap-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Crown size={36} weight="fill" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Arena 1v1 Chess</h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              Fast 5-minute blitz chess against fellow doctors. Win +100 pts on the venue leaderboard.
            </p>
          </div>

          {actionError && (
            <div className="w-full p-3 rounded-xl bg-red-950/60 border border-red-800/40 text-red-300 text-xs text-center">
              {actionError}
            </div>
          )}

          {viewState === 'MATCHING' ? (
            <div className="w-full py-8 flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-sky-500/30 animate-ping absolute" />
                <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-400 flex items-center justify-center text-sky-400">
                  <CircleNotch size={28} className="animate-spin" />
                </div>
              </div>
              <p className="text-sm font-medium text-sky-300">Finding an opponent doctor in Arena...</p>
              <button
                onClick={handleCancelQueue}
                className="text-xs text-zinc-400 underline hover:text-white cursor-pointer active:scale-95 transition-transform"
              >
                Cancel Queue
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3 mt-2">
              <button
                onClick={startPvpMatch}
                disabled={loadingAction}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98] transition-all text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 cursor-pointer"
              >
                <Lightning size={18} weight="fill" />
                <span>Find 1v1 Opponent (5 min Blitz)</span>
              </button>

              <button
                onClick={startBotMatch}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-750 active:scale-[0.98] transition-all border border-zinc-700/60 text-zinc-200 font-medium text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={16} weight="fill" className="text-emerald-400" />
                <span>Practice vs Dr. DeepBlue (AI Bot)</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center flex flex-col items-center gap-1">
            <Trophy size={18} className="text-amber-400" />
            <span className="text-[11px] text-zinc-400">Win</span>
            <span className="text-xs font-bold text-white">+100 pts</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center flex flex-col items-center gap-1">
            <Swords size={18} className="text-sky-400" />
            <span className="text-[11px] text-zinc-400">Draw</span>
            <span className="text-xs font-bold text-white">+50 pts</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center flex flex-col items-center gap-1">
            <CheckCircle size={18} className="text-emerald-400" />
            <span className="text-[11px] text-zinc-400">Play</span>
            <span className="text-xs font-bold text-white">+10 pts</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: ACTIVE GAME BOARD
  // ==========================================================================
  const isOpponentClockRunning = !isMyTurn && gameData?.status === 'in_progress';
  const isMyClockRunning = isMyTurn && (matchMode === 'bot' || gameData?.status === 'in_progress');

  return (
    <div className="w-full max-w-md mx-auto p-3 flex flex-col gap-2 select-none animate-fade-in pb-16">
      {/* Top Header: Game Controls */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => {
            if (matchMode === 'bot') {
              resetToLobby();
            } else {
              setShowResignModal(true);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 active:scale-95 text-xs hover:text-white cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Leave</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'
              }`}
          />
          <span className="font-medium text-zinc-300">
            {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
          </span>
          {chessRef.current.inCheck() && (
            <span className="px-1.5 py-0.5 rounded bg-red-900/80 text-red-300 font-bold text-[10px]">
              CHECK
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 active:scale-95 hover:text-white cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <SpeakerSlash size={15} /> : <SpeakerHigh size={15} />}
          </button>
          <button
            onClick={() => setFlipBoard(!flipBoard)}
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 active:scale-95 hover:text-white cursor-pointer"
            title="Flip Board View"
          >
            <ArrowClockwise size={15} />
          </button>
        </div>
      </div>

      {actionError && (
        <div className="w-full p-2 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-300 text-xs text-center">
          {actionError}
        </div>
      )}

      {/* OPPONENT BANNER (TOP) */}
      <div
        className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${!isMyTurn
          ? 'bg-zinc-900/90 border-sky-500/40 shadow-md shadow-sky-950/30'
          : 'bg-zinc-900/50 border-zinc-800/80'
          }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 flex items-center justify-center">
            <ArenaAvatar avatarId={opponent?.avatar || '1'} size={32} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                {opponent?.name || opponent?.guest_id || 'Opponent'}
              </span>
              <span className="text-[10px] px-1 rounded bg-zinc-800 text-zinc-400">
                {playerColor === 'w' ? 'Black' : 'White'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
              <span>
                {(playerColor === 'w'
                  ? capturedPieces.blackCaptured
                  : capturedPieces.whiteCaptured
                ).join(' ')}
              </span>
              {capturedPieces.advantage !== 0 && (
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {playerColor === 'w' && capturedPieces.advantage < 0
                    ? `+${Math.abs(capturedPieces.advantage)}`
                    : playerColor === 'b' && capturedPieces.advantage > 0
                      ? `+${capturedPieces.advantage}`
                      : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Isolated Opponent Clock */}
        <ChessClock
          isRunning={isOpponentClockRunning}
          baseTimeMs={playerColor === 'w' ? blackBaseMs : whiteBaseMs}
          lastMoveAt={lastMoveAt}
          serverOffsetMs={serverOffsetMs}
          onFlagFall={handleOpponentFlagFall}
        />
      </div>

      {/* CHESSBOARD (Mobile 1:1 Locked Viewport) */}
      <div className="w-full aspect-square relative rounded-md shadow-2xl border border-zinc-800 touch-none bg-zinc-950">
        <Chessboard
          options={{
            position: fen,
            boardOrientation,
            onPieceDrop: handlePieceDrop,
            onSquareClick: handleSquareClick,
            onPieceClick: ({ square }) => handleSquareClick({ square }),
            onPieceDrag: handlePieceDrag,
            onPieceDragCancel: handlePieceDragCancel,
            canDragPiece,
            dragActivationDistance: 7,
            allowDragOffBoard: true,
            draggingPieceGhostStyle: {
              opacity: 0.85,
            },
            draggingPieceStyle: {
              transform: 'scale(1.15)',
              filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.45))',
              zIndex: 100,
            },
            squareStyles,
            animationDurationInMs: 150,
            darkSquareStyle: { backgroundColor: '#455871ff' },
            lightSquareStyle: { backgroundColor: '#CBD5E1' },
            darkSquareNotationStyle: {
              color: '#b4becbff',
              fontWeight: '700',
            },
            lightSquareNotationStyle: {
              color: '#6d7c91ff',
              fontWeight: '700',
            },
            alphaNotationStyle: {
              fontSize: '9.5px',
              position: 'absolute',
              bottom: 2,
              right: 3,
              lineHeight: 1,
              userSelect: 'none',
            },
            numericNotationStyle: {
              fontSize: '9.5px',
              position: 'absolute',
              top: 2,
              left: 3,
              lineHeight: 1,
              userSelect: 'none',
            },
            dropSquareStyle: {
              boxShadow: 'inset 0 0 1px 3px rgba(56, 189, 248, 0.8)',
            },
          }}
        />

        {/* Promotion Modal */}
        {pendingPromotion && (
          <div
            className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPendingPromotion(null)}
          >
            <div
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col items-center gap-3 shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-zinc-300">Choose Promotion</span>
                <button
                  onClick={() => setPendingPromotion(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                  title="Cancel"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="flex gap-2">
                {[
                  { id: 'q', label: '♛ Queen' },
                  { id: 'r', label: '♜ Rook' },
                  { id: 'b', label: '♝ Bishop' },
                  { id: 'n', label: '♞ Knight' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      makeMove(pendingPromotion.from, pendingPromotion.to, id);
                      setPendingPromotion(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-sky-600 active:scale-95 text-xs font-bold text-white border border-zinc-700 cursor-pointer transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACTIVE PLAYER BANNER (BOTTOM) */}
      <div
        className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${isMyTurn
          ? 'bg-zinc-900/90 border-sky-500/40 shadow-md shadow-sky-950/30'
          : 'bg-zinc-900/50 border-zinc-800/80'
          }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 flex items-center justify-center">
            <ArenaAvatar avatarId={player?.avatar || '1'} size={32} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                {player?.name || player?.guest_id || 'You'}
              </span>
              <span className="text-[10px] px-1 rounded bg-zinc-800 text-zinc-400">
                {playerColor === 'w' ? 'White' : 'Black'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
              <span>
                {(playerColor === 'w'
                  ? capturedPieces.whiteCaptured
                  : capturedPieces.blackCaptured
                ).join(' ')}
              </span>
              {capturedPieces.advantage !== 0 && (
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {playerColor === 'w' && capturedPieces.advantage > 0
                    ? `+${capturedPieces.advantage}`
                    : playerColor === 'b' && capturedPieces.advantage < 0
                      ? `+${Math.abs(capturedPieces.advantage)}`
                      : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Isolated Active Player Clock */}
        <ChessClock
          isRunning={isMyClockRunning}
          baseTimeMs={playerColor === 'w' ? whiteBaseMs : blackBaseMs}
          lastMoveAt={lastMoveAt}
          serverOffsetMs={serverOffsetMs}
          onFlagFall={() => {
            if (matchMode === 'bot') {
              if (botFlaggedRef.current) return;
              botFlaggedRef.current = true;
              handleBotGameOver('player_timeout');
            }
          }}
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setShowResignModal(true)}
          className="px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 text-xs hover:text-red-400 active:scale-95 cursor-pointer"
        >
          Resign Match
        </button>
      </div>

      {/* RESIGN CONFIRMATION MODAL */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/40 text-red-400 flex items-center justify-center">
              <Sword size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Forfeit Game?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Resigning awards victory to your opponent.
              </p>
            </div>
            <div className="w-full flex gap-2">
              <button
                onClick={() => setShowResignModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                onClick={handleResign}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
              >
                Yes, Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {viewState === 'GAME_OVER' && endSummary && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full flex flex-col items-center text-center gap-4 shadow-2xl animate-scale-up">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${endSummary.isWinner
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : endSummary.isDraw
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
            >
              {endSummary.isWinner ? (
                <Trophy size={36} weight="fill" />
              ) : endSummary.isDraw ? (
                <Swords size={36} />
              ) : (
                <Sword size={36} />
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white">
                {endSummary.isWinner ? 'Victory!' : endSummary.isDraw ? 'Draw Game' : 'Defeat'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider">
                {endSummary.status} ({endSummary.end_reason})
              </p>
            </div>

            {/* Points Badge */}
            <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-sky-500/10 border border-sky-500/30 text-sky-300 flex items-center gap-2">
              <Lightning size={18} weight="fill" className="text-amber-400" />
              <span className="text-sm font-bold">
                {matchMode === 'bot'
                  ? 'Practice Mode (0 Arena Points)'
                  : `+${endSummary.points} Arena Points`}
              </span>
            </div>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={resetToLobby}
                className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Play Another Game
              </button>
              <button
                onClick={() => {
                  resetToLobby();
                  onBack();
                }}
                className="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              >
                Back to Arena Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
