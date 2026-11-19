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
} from '../icons';
import ArenaAvatar from '../avatars/ArenaAvatar';
import {
  joinOrCreateMatchmaking,
  getChessGame,
  submitMove,
  claimChessTimeout,
  resignChessGame,
  subscribeToChessGame,
} from '../../services/chessService';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playVictorySound,
  playDefeatSound,
  triggerHaptic,
} from '../../utils/chessAudio';

// Piece value table for basic captured pieces & bot evaluation
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Format milliseconds into MM:SS
 */
function formatClock(ms) {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ChessView({ player, onBack }) {
  // Screen views: 'LOBBY' | 'MATCHING' | 'PLAYING' | 'GAME_OVER'
  const [viewState, setViewState] = useState('LOBBY');
  const [matchMode, setMatchMode] = useState(null); // 'pvp' | 'bot'
  const [gameId, setGameId] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [playerColor, setPlayerColor] = useState('w'); // 'w' | 'b'
  const [flipBoard, setFlipBoard] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Chess Engine instance (chess.js)
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());

  // Clocks (Interpolated locally without DB tick spam)
  const [whiteClock, setWhiteClock] = useState(300000);
  const [blackClock, setBlackClock] = useState(300000);
  const lastMoveTimeRef = useRef(Date.now());
  const activeTurnRef = useRef('w');

  // Tap-to-move square highlights
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [squareStyles, setSquareStyles] = useState({});

  // Pawn Promotion state
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // In-game Modals
  const [showResignModal, setShowResignModal] = useState(false);
  const [endSummary, setEndSummary] = useState(null);

  // Active Opponent representation
  const opponent = useMemo(() => {
    if (matchMode === 'bot') {
      return {
        name: 'Dr. DeepBlue (AI)',
        guest_id: 'AI-BOT',
        avatar: '5',
        total_score: 999,
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

  // Compute Captured Pieces & Point Differential
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
    // What White captured = Black's missing pieces
    // What Black captured = White's missing pieces
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
  // CLOCK SYNCHRONIZATION (0-DB-Tick local interpolation)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (viewState !== 'PLAYING') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastMoveTimeRef.current;

      if (activeTurnRef.current === 'w') {
        setWhiteClock((prev) => {
          const next = Math.max(0, prev - 100);
          if (next === 0 && matchMode === 'pvp' && playerColor === 'b' && gameId) {
            // Opponent flagged! Claim timeout
            claimChessTimeout(gameId, player.id);
          }
          return next;
        });
      } else {
        setBlackClock((prev) => {
          const next = Math.max(0, prev - 100);
          if (next === 0 && matchMode === 'pvp' && playerColor === 'w' && gameId) {
            // Opponent flagged! Claim timeout
            claimChessTimeout(gameId, player.id);
          }
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [viewState, matchMode, playerColor, gameId, player?.id]);

  // --------------------------------------------------------------------------
  // REALTIME SUBSCRIPTION FOR PVP
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!gameId || matchMode !== 'pvp') return;

    const unsubscribe = subscribeToChessGame(gameId, (updatedGame) => {
      if (!updatedGame) return;

      // Sync FEN & Turn
      if (updatedGame.fen && updatedGame.fen !== chessRef.current.fen()) {
        const prevFen = chessRef.current.fen();
        chessRef.current.load(updatedGame.fen);
        setFen(updatedGame.fen);
        activeTurnRef.current = updatedGame.turn;
        lastMoveTimeRef.current = Date.now();

        // Audio feedback on opponent move
        if (chessRef.current.inCheck()) {
          playCheckSound();
        } else if (updatedGame.fen.length < prevFen.length) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
      }

      // Sync Clocks from server baseline
      if (typeof updatedGame.white_time_left_ms === 'number') {
        setWhiteClock(updatedGame.white_time_left_ms);
      }
      if (typeof updatedGame.black_time_left_ms === 'number') {
        setBlackClock(updatedGame.black_time_left_ms);
      }

      // Game Over Check
      if (updatedGame.status !== 'in_progress') {
        const isWinner = updatedGame.winner_id === player?.id;
        const isDraw = ['stalemate', 'draw_agreed'].includes(updatedGame.status);
        if (isWinner) playVictorySound();
        else if (!isDraw) playDefeatSound();

        setEndSummary({
          status: updatedGame.status,
          winner_id: updatedGame.winner_id,
          end_reason: updatedGame.end_reason,
          isWinner,
          isDraw,
          points: isWinner ? 100 : isDraw ? 50 : 10,
        });
        setViewState('GAME_OVER');
      }

      setGameData((prev) => ({ ...prev, ...updatedGame }));
    });

    return () => unsubscribe();
  }, [gameId, matchMode, player?.id]);

  // --------------------------------------------------------------------------
  // MATCHMAKING ACTIONS
  // --------------------------------------------------------------------------
  const startPvpMatch = async () => {
    if (!player?.id) return;
    setLoadingAction(true);
    setActionError('');
    setMatchMode('pvp');
    setViewState('MATCHING');

    try {
      const res = await joinOrCreateMatchmaking(player.id, 300);
      if (res.action === 'matched' || res.action === 'reconnected') {
        setGameId(res.game_id);
        setPlayerColor(res.color || 'w');

        // Fetch full initial game record
        const initialGame = await getChessGame(res.game_id);
        setGameData(initialGame);
        chessRef.current.load(initialGame.fen);
        setFen(initialGame.fen);
        setWhiteClock(initialGame.white_time_left_ms);
        setBlackClock(initialGame.black_time_left_ms);
        activeTurnRef.current = initialGame.turn;
        lastMoveTimeRef.current = Date.now();
        setViewState('PLAYING');
      } else {
        // In queue waiting
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

  const startBotMatch = () => {
    setMatchMode('bot');
    setGameId(`bot_${Date.now()}`);
    setPlayerColor('w'); // Player plays White
    chessRef.current.reset();
    setFen(chessRef.current.fen());
    setWhiteClock(300000);
    setBlackClock(300000);
    activeTurnRef.current = 'w';
    lastMoveTimeRef.current = Date.now();
    setViewState('PLAYING');
  };

  // --------------------------------------------------------------------------
  // BOT MOVE GENERATOR (Min-Max / Heuristic Evaluation)
  // --------------------------------------------------------------------------
  const executeBotMove = useCallback(() => {
    if (chessRef.current.isGameOver() || viewState !== 'PLAYING') return;

    // Small thinking delay so it feels natural
    setTimeout(() => {
      const moves = chessRef.current.moves({ verbose: true });
      if (moves.length === 0) return;

      // 1. Check for immediate captures or checks
      let bestMove = moves[Math.floor(Math.random() * moves.length)];
      let bestScore = -9999;

      for (const m of moves) {
        chessRef.current.move(m);
        let score = 0;
        if (m.captured) score += (PIECE_VALUES[m.captured] || 1) * 10;
        if (chessRef.current.inCheck()) score += 5;
        chessRef.current.undo();

        if (score > bestScore) {
          bestScore = score;
          bestMove = m;
        }
      }

      const move = chessRef.current.move(bestMove);
      if (move) {
        setFen(chessRef.current.fen());
        activeTurnRef.current = 'w';
        lastMoveTimeRef.current = Date.now();

        if (chessRef.current.inCheck()) playCheckSound();
        else if (move.captured) playCaptureSound();
        else playMoveSound();

        // Check if game over after bot move
        if (chessRef.current.isGameOver()) {
          handleBotGameOver();
        }
      }
    }, 500);
  }, [viewState]);

  const handleBotGameOver = () => {
    let isWinner = false;
    let isDraw = false;
    let status = 'checkmate';

    if (chessRef.current.isCheckmate()) {
      isWinner = chessRef.current.turn() !== playerColor;
    } else {
      isDraw = true;
      status = 'stalemate';
    }

    if (isWinner) playVictorySound();
    else if (!isDraw) playDefeatSound();

    setEndSummary({
      status,
      winner_id: isWinner ? player?.id : 'bot',
      end_reason: status,
      isWinner,
      isDraw,
      points: isWinner ? 50 : isDraw ? 25 : 5, // Practice bot gives half points
    });
    setViewState('GAME_OVER');
  };

  // --------------------------------------------------------------------------
  // MOVE EXECUTION (Tap-to-move & Drag-and-drop)
  // --------------------------------------------------------------------------
  const makeMove = useCallback(
    async (from, to, promotion = 'q') => {
      if (!isMyTurn) return false;

      // Check if pawn promotion is needed
      const piece = chessRef.current.get(from);
      if (
        piece &&
        piece.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1')) &&
        !promotion
      ) {
        setPendingPromotion({ from, to });
        return false;
      }

      let move;
      try {
        move = chessRef.current.move({ from, to, promotion: promotion || 'q' });
      } catch {
        move = null;
      }

      if (!move) return false;

      const newFen = chessRef.current.fen();
      const newPgn = chessRef.current.pgn();
      const isGameOver = chessRef.current.isGameOver();
      let endStatus = null;
      let winnerId = null;
      let endReason = null;

      if (isGameOver) {
        if (chessRef.current.isCheckmate()) {
          endStatus = 'checkmate';
          winnerId = player?.id;
          endReason = 'checkmate';
        } else {
          endStatus = 'stalemate';
          endReason = 'draw';
        }
      }

      // Update local state immediately for 0ms lag
      setFen(newFen);
      setSelectedSquare(null);
      setSquareStyles({});
      activeTurnRef.current = chessRef.current.turn();
      lastMoveTimeRef.current = Date.now();

      if (chessRef.current.inCheck()) playCheckSound();
      else if (move.captured) playCaptureSound();
      else playMoveSound();

      // Bot Mode execution
      if (matchMode === 'bot') {
        if (isGameOver) {
          handleBotGameOver();
        } else {
          executeBotMove();
        }
        return true;
      }

      // PvP Mode submission to backend
      try {
        await submitMove({
          gameId,
          playerId: player.id,
          from,
          to,
          promotion: promotion || 'q',
          newFen,
          newPgn,
          isGameOver,
          endStatus,
          winnerId,
          endReason,
        });
      } catch (err) {
        console.error('Failed to submit move:', err);
      }

      return true;
    },
    [isMyTurn, player?.id, matchMode, gameId, executeBotMove]
  );

  // --------------------------------------------------------------------------
  // TAP-TO-MOVE HIGHLIGHT ENGINE
  // --------------------------------------------------------------------------
  const handleSquareClick = useCallback(
    ({ square }) => {
      if (!isMyTurn) return;

      // 1. If no square currently selected:
      if (!selectedSquare) {
        const piece = chessRef.current.get(square);
        if (piece && piece.color === playerColor) {
          setSelectedSquare(square);

          // Calculate legal moves from this square
          const moves = chessRef.current.moves({ square, verbose: true });
          const newStyles = {
            [square]: { backgroundColor: 'rgba(56, 189, 248, 0.45)' }, // Sky-400 selected glow
          };

          moves.forEach((m) => {
            newStyles[m.to] = {
              background: m.captured
                ? 'radial-gradient(circle, rgba(239, 68, 68, 0.7) 30%, transparent 32%)' // Red dot for captures
                : 'radial-gradient(circle, rgba(56, 189, 248, 0.6) 25%, transparent 27%)', // Cyan dot for quiet moves
              borderRadius: '50%',
            };
          });

          setSquareStyles(newStyles);
          triggerHaptic(10);
        }
        return;
      }

      // 2. Clicked same square: deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setSquareStyles({});
        return;
      }

      // 3. Clicked another own piece: switch selection
      const targetPiece = chessRef.current.get(square);
      if (targetPiece && targetPiece.color === playerColor) {
        setSelectedSquare(square);
        const moves = chessRef.current.moves({ square, verbose: true });
        const newStyles = {
          [square]: { backgroundColor: 'rgba(56, 189, 248, 0.45)' },
        };
        moves.forEach((m) => {
          newStyles[m.to] = {
            background: m.captured
              ? 'radial-gradient(circle, rgba(239, 68, 68, 0.7) 30%, transparent 32%)'
              : 'radial-gradient(circle, rgba(56, 189, 248, 0.6) 25%, transparent 27%)',
            borderRadius: '50%',
          };
        });
        setSquareStyles(newStyles);
        triggerHaptic(10);
        return;
      }

      // 4. Attempt to execute move from selectedSquare -> square
      makeMove(selectedSquare, square);
    },
    [isMyTurn, selectedSquare, playerColor, makeMove]
  );

  // --------------------------------------------------------------------------
  // DRAG-AND-DROP HANDLER
  // --------------------------------------------------------------------------
  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      if (!targetSquare || !isMyTurn) return false;
      return makeMove(sourceSquare, targetSquare);
    },
    [isMyTurn, makeMove]
  );

  // --------------------------------------------------------------------------
  // RESIGNATION & FORFEIT
  // --------------------------------------------------------------------------
  const handleResign = async () => {
    setShowResignModal(false);
    if (matchMode === 'bot') {
      playDefeatSound();
      setEndSummary({
        status: 'resigned',
        winner_id: 'bot',
        end_reason: 'resignation',
        isWinner: false,
        isDraw: false,
        points: 5,
      });
      setViewState('GAME_OVER');
      return;
    }

    if (gameId && opponent?.id) {
      try {
        await resignChessGame(gameId, player.id, opponent.id);
      } catch (err) {
        console.error('Failed to resign:', err);
      }
    }
  };

  // Determine board perspective
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
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Arena</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-500/30 text-sky-400 text-xs font-semibold tracking-wider">
            <Swords size={16} />
            <span>CHESS ARENA</span>
          </div>
        </div>

        {/* Hero Card */}
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

          {/* Matchmaking Queue Animation */}
          {viewState === 'MATCHING' ? (
            <div className="w-full py-8 flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-sky-500/30 animate-ping absolute" />
                <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-400 flex items-center justify-center text-sky-400">
                  <CircleNotch size={28} className="animate-spin" />
                </div>
              </div>
              <p className="text-sm font-medium text-sky-300">Finding an opponent in Arena...</p>
              <button
                onClick={() => setViewState('LOBBY')}
                className="text-xs text-zinc-400 underline hover:text-white"
              >
                Cancel Queue
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3 mt-2">
              <button
                onClick={startPvpMatch}
                disabled={loadingAction}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98] transition-all text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
              >
                <Lightning size={18} weight="fill" />
                <span>Find 1v1 Opponent (5 min Blitz)</span>
              </button>

              <button
                onClick={startBotMatch}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-750 active:scale-[0.98] transition-all border border-zinc-700/60 text-zinc-200 font-medium text-sm flex items-center justify-center gap-2"
              >
                <Play size={16} weight="fill" className="text-emerald-400" />
                <span>Practice vs Dr. DeepBlue (AI Bot)</span>
              </button>
            </div>
          )}
        </div>

        {/* Rules & Rewards strip */}
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
  return (
    <div className="w-full max-w-md mx-auto p-3 flex flex-col gap-2 select-none animate-fade-in pb-16">
      {/* Top Header: Game Controls */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setShowResignModal(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 active:scale-95 text-xs hover:text-white"
        >
          <ArrowLeft size={14} />
          <span>Leave</span>
        </button>

        {/* Turn Indicator Banner */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isMyTurn ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'
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

        <button
          onClick={() => setFlipBoard(!flipBoard)}
          className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 active:scale-95 hover:text-white"
          title="Flip Board View"
        >
          <ArrowClockwise size={15} />
        </button>
      </div>

      {/* OPPONENT BANNER (TOP) */}
      <div
        className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
          !isMyTurn
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
            {/* Captured Pieces Display */}
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

        {/* Opponent Clock */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold tracking-wider ${
            !isMyTurn
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'bg-zinc-800/80 text-zinc-400'
          }`}
        >
          <Clock size={15} />
          <span>{formatClock(playerColor === 'w' ? blackClock : whiteClock)}</span>
        </div>
      </div>

      {/* THE CHESSBOARD (Mobile 1:1 Locked Viewport) */}
      <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 touch-none bg-zinc-950">
        <Chessboard
          options={{
            position: fen,
            boardOrientation,
            onPieceDrop: handlePieceDrop,
            onSquareClick: handleSquareClick,
            squareStyles,
            animationDurationInMs: 150,
            darkSquareStyle: { backgroundColor: '#1E293B' }, // Slate-800
            lightSquareStyle: { backgroundColor: '#94A3B8' }, // Slate-400
            dropSquareStyle: {
              boxShadow: 'inset 0 0 1px 3px rgba(56, 189, 248, 0.8)',
            },
          }}
        />

        {/* Pawn Promotion Modal */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col items-center gap-3 shadow-2xl">
              <span className="text-xs font-semibold text-zinc-300">Promote Pawn</span>
              <div className="flex gap-2">
                {['q', 'r', 'b', 'n'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      makeMove(pendingPromotion.from, pendingPromotion.to, p);
                      setPendingPromotion(null);
                    }}
                    className="w-12 h-12 rounded-xl bg-zinc-800 hover:bg-sky-600 active:scale-95 text-xl font-bold flex items-center justify-center text-white border border-zinc-700 uppercase"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACTIVE PLAYER BANNER (BOTTOM) */}
      <div
        className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
          isMyTurn
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
            {/* Captured Pieces Display */}
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

        {/* Active Player Clock */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold tracking-wider ${
            isMyTurn
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'bg-zinc-800/80 text-zinc-400'
          }`}
        >
          <Clock size={15} />
          <span>{formatClock(playerColor === 'w' ? whiteClock : blackClock)}</span>
        </div>
      </div>

      {/* Action Bar (Resign Button) */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setShowResignModal(true)}
          className="px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 text-xs hover:text-red-400 active:scale-95"
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
                Resigning awards victory to your opponent. You will still receive +10 participation pts.
              </p>
            </div>
            <div className="w-full flex gap-2">
              <button
                onClick={() => setShowResignModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Keep Playing
              </button>
              <button
                onClick={handleResign}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
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
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                endSummary.isWinner
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

            {/* Points Award Badge */}
            <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-sky-500/10 border border-sky-500/30 text-sky-300 flex items-center gap-2">
              <Lightning size={18} weight="fill" className="text-amber-400" />
              <span className="text-sm font-bold">+{endSummary.points} Arena Points</span>
            </div>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={() => {
                  setViewState('LOBBY');
                  setEndSummary(null);
                }}
                className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs active:scale-95 transition-all"
              >
                Play Another Game
              </button>
              <button
                onClick={onBack}
                className="w-full py-2.5 rounded-2xl bg-zinc-800 text-zinc-300 text-xs font-semibold active:scale-95 transition-all"
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
