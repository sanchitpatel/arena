import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Scroll,
  Brain,
  ChessPawn,
  Rocket,
  Lightning,
  Sparkle,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  ArrowClockwise,
  Trophy,
  CircleNotch,
  Check,
  Medal,
} from '../icons';
import { QUESTS } from '../../data/questsData';
import { fetchPlayerQuestScores, recordQuestScore } from '../../services/questService';
import { getPlayerUuid, getPlayerId } from '../../utils/playerId';

// Map icon names to Phosphor components
function QuestIcon({ name, size = 24, className = '' }) {
  switch (name) {
    case 'Brain':
      return <Brain size={size} weight="duotone" className={className} />;
    case 'ChessPawn':
      return <ChessPawn size={size} weight="duotone" className={className} />;
    case 'Rocket':
      return <Rocket size={size} weight="duotone" className={className} />;
    case 'Lightning':
      return <Lightning size={size} weight="duotone" className={className} />;
    default:
      return <Scroll size={size} weight="duotone" className={className} />;
  }
}

export const QuestsView = ({ player, onNavigate }) => {
  const playerId = player?.id || getPlayerUuid();
  const guestId = player?.guest_id || getPlayerId() || 'Guest';

  // Navigation & Active State
  const [activeQuest, setActiveQuest] = useState(null); // Quest object if in quiz
  const [questScores, setQuestScores] = useState({}); // { [questId]: { score, correctCount, totalQuestions, completedAt } }
  const [loadingScores, setLoadingScores] = useState(true);

  // Quiz Gameplay State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // Option index (0..3)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]); // [{ questionId, selectedIndex, isCorrect, points }]
  const [quizFinished, setQuizFinished] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load scores on mount & listen to changes
  useEffect(() => {
    let isMounted = true;
    const loadScores = async () => {
      try {
        const res = await fetchPlayerQuestScores(playerId);
        if (isMounted && res?.data) {
          setQuestScores(res.data);
        }
      } catch (e) {
        console.warn('[QuestsView] Failed to load scores:', e);
      } finally {
        if (isMounted) setLoadingScores(false);
      }
    };

    loadScores();

    const handleQuestCompleted = () => {
      loadScores();
    };

    window.addEventListener('arena:quest-completed', handleQuestCompleted);
    return () => {
      isMounted = false;
      window.removeEventListener('arena:quest-completed', handleQuestCompleted);
    };
  }, [playerId]);

  // Overall player stats
  const totalEarnedPoints = useMemo(() => {
    return Object.values(questScores).reduce((sum, q) => sum + (Number(q?.score) || 0), 0);
  }, [questScores]);

  const completedCount = useMemo(() => {
    return Object.keys(questScores).length;
  }, [questScores]);

  // Start a quest
  const handleStartQuest = (quest) => {
    setActiveQuest(quest);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setUserAnswers([]);
    setQuizFinished(false);
    setSaveSuccess(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Exit back to Quests Catalog
  const handleExitToCatalog = () => {
    setActiveQuest(null);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setUserAnswers([]);
    setQuizFinished(false);
    setSaveSuccess(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Current active question
  const currentQuestion = useMemo(() => {
    if (!activeQuest) return null;
    return activeQuest.questions[currentQuestionIndex] || null;
  }, [activeQuest, currentQuestionIndex]);

  // Select an option
  const handleSelectOption = (index) => {
    if (isAnswerSubmitted) return; // locked once submitted
    setSelectedOption(index);
  };

  // Submit the selected answer for instant evaluation
  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted || !currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.correctIndex;
    const points = isCorrect ? activeQuest.pointsPerQuestion : 0;

    setIsAnswerSubmitted(true);
    setUserAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        selectedIndex: selectedOption,
        isCorrect,
        points,
      },
    ]);
  };

  // Move to next question or finalize quiz
  const handleNextQuestion = async () => {
    if (!activeQuest) return;

    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < activeQuest.questions.length) {
      setCurrentQuestionIndex(nextIdx);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      // Quiz Completed! Calculate score and record in DB
      setQuizFinished(true);
      setIsSavingScore(true);

      const allAnswers = [...userAnswers];
      const correctAnswersCount = allAnswers.filter((a) => a.isCorrect).length;
      const finalScore = correctAnswersCount * activeQuest.pointsPerQuestion;
      const totalQ = activeQuest.questions.length;

      try {
        const res = await recordQuestScore({
          playerId,
          guestId,
          questId: activeQuest.id,
          score: finalScore,
          correctCount: correctAnswersCount,
          totalQuestions: totalQ,
        });

        if (res?.success) {
          setSaveSuccess(true);
          // Refresh local questScores state
          setQuestScores((prev) => ({
            ...prev,
            [activeQuest.id]: {
              score: Math.max(finalScore, prev[activeQuest.id]?.score || 0),
              correctCount: Math.max(correctAnswersCount, prev[activeQuest.id]?.correctCount || 0),
              totalQuestions: totalQ,
              completedAt: new Date().toISOString(),
            },
          }));
        }
      } catch (err) {
        console.warn('[QuestsView] Failed to record quest score:', err);
      } finally {
        setIsSavingScore(false);
      }
    }
  };

  // Replay the current active quest
  const handleReplayQuest = () => {
    if (!activeQuest) return;
    handleStartQuest(activeQuest);
  };

  // Render option letter badge (A, B, C, D)
  const getOptionLetter = (idx) => String.fromCharCode(65 + idx);

  // =========================================================================
  // VIEW 1: ACTIVE QUIZ PLAYBACK / GAMEPLAY
  // =========================================================================
  if (activeQuest) {
    const totalQuestions = activeQuest.questions.length;
    const progressPercent = Math.round(((currentQuestionIndex + (isAnswerSubmitted ? 1 : 0)) / totalQuestions) * 100);
    const liveScore = userAnswers.reduce((sum, a) => sum + a.points, 0);
    const correctCount = userAnswers.filter((a) => a.isCorrect).length;

    // --- Sub-View: Quiz Results Screen ---
    if (quizFinished) {
      const percentage = Math.round((correctCount / totalQuestions) * 100);
      const isPerfect = correctCount === totalQuestions;

      return (
        <div className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-3 pb-16 animate-in fade-in duration-200">
          {/* Top Return Button */}
          <button
            type="button"
            onClick={handleExitToCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 mb-4 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/90 shadow-[inset_1px_1px_2px_#ffffff,0_2px_4px_rgba(0,0,0,0.04)] cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>All Quests</span>
          </button>

          {/* Results Summary Card (Clean Neumorphic Theme) */}
          <div className="rounded-[28px] sm:rounded-[32px] bg-[#ebedf2] border border-white/90 p-6 sm:p-8 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_12px_32px_rgba(0,0,0,0.08)] flex flex-col items-center text-center">
            {/* Trophy / Medal Badge */}
            <div className="relative mb-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 p-[3px] shadow-[0_8px_24px_rgba(14,165,233,0.35)] flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#ebedf2] flex items-center justify-center shadow-inner">
                  <Trophy size={42} weight="fill" className="text-amber-500 animate-bounce" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                <Check size={16} weight="bold" />
              </div>
            </div>

            {/* Title & Feedback */}
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 mb-1">
              {activeQuest.category}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-arena">
              Quest Complete!
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1 max-w-sm">
              {isPerfect
                ? 'Flawless run! You answered every question correctly.'
                : `Great effort! You mastered ${percentage}% of this challenge.`}
            </p>

            {/* Score Breakdown Metrics */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-md my-6">
              {/* Correct Answers */}
              <div className="p-3.5 rounded-2xl bg-white/80 border border-white shadow-[inset_1px_1px_2px_#ffffff,0_2px_6px_rgba(0,0,0,0.04)] flex flex-col items-center">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                  Correct Answers
                </span>
                <span className="text-xl sm:text-2xl font-black text-zinc-900 mt-0.5">
                  {correctCount} <span className="text-xs font-bold text-zinc-400">/ {totalQuestions}</span>
                </span>
              </div>

              {/* Total Score */}
              <div className="p-3.5 rounded-2xl bg-white/80 border border-white shadow-[inset_1px_1px_2px_#ffffff,0_2px_6px_rgba(0,0,0,0.04)] flex flex-col items-center">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                  Arena Points
                </span>
                <span className="text-xl sm:text-2xl font-black text-sky-600 mt-0.5">
                  +{correctCount * activeQuest.pointsPerQuestion} <span className="text-xs font-bold text-sky-500">PTS</span>
                </span>
              </div>
            </div>

            {/* DB Sync Confirmation Badge */}
            <div className="w-full max-w-md py-2.5 px-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 mb-6 shadow-xs">
              {isSavingScore ? (
                <>
                  <CircleNotch size={15} className="animate-spin text-emerald-600 shrink-0" />
                  <span>Recording score to database...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
                  <span>Score recorded to your Player Wallet & Leaderboard!</span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <button
                type="button"
                onClick={handleReplayQuest}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-zinc-800 text-xs sm:text-sm font-bold border border-slate-200 shadow-[inset_0_2px_4px_#ffffff,0_2px_6px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowClockwise size={16} weight="bold" className="text-zinc-600" />
                <span>Replay Quiz</span>
              </button>

              <button
                type="button"
                onClick={handleExitToCatalog}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 text-white text-xs sm:text-sm font-bold border border-zinc-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Back to Quests</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // --- Sub-View: Active Question Card ---
    return (
      <div className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-3 pb-16 animate-in fade-in duration-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            type="button"
            onClick={handleExitToCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/90 shadow-[inset_1px_1px_2px_#ffffff,0_2px_4px_rgba(0,0,0,0.04)] cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Quit</span>
          </button>

          {/* Live Score Counter */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-700 text-xs font-black shadow-xs">
            <Sparkle size={13} weight="fill" className="text-sky-500" />
            <span>{liveScore} PTS</span>
          </div>
        </div>

        {/* Progress Tracker Card */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#ebedf2] border border-white/90 shadow-[inset_2px_2px_5px_#ffffff,inset_-2px_-2px_5px_#c5ccd6] mb-4">
          <div className="flex items-center justify-between text-xs font-extrabold mb-1.5 text-zinc-600">
            <span className="uppercase tracking-wider">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="text-sky-600">{progressPercent}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question Container Card */}
        <div className="rounded-[28px] sm:rounded-[32px] bg-[#ebedf2] border border-white/90 p-5 sm:p-7 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_10px_28px_rgba(0,0,0,0.06)]">
          {/* Question Category & Points Badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-zinc-700 border border-slate-200/80 shadow-2xs">
              {activeQuest.category}
            </span>
            <span className="text-[11px] font-black text-sky-600">
              +{activeQuest.pointsPerQuestion} PTS
            </span>
          </div>

          {/* Question Text */}
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug mb-5">
            {currentQuestion.question}
          </h3>

          {/* Options List */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((optionText, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectOption = idx === currentQuestion.correctIndex;
              const isWrongChoice = isAnswerSubmitted && isSelected && !isCorrectOption;
              const isRightChoice = isAnswerSubmitted && isCorrectOption;

              // Option button styling based on state
              let btnClasses = 'bg-white/80 hover:bg-white text-zinc-800 border-white/90 shadow-[inset_1px_1px_2px_#ffffff,0_2px_5px_rgba(0,0,0,0.04)]';
              let badgeClasses = 'bg-slate-100 text-zinc-700 border-slate-200';

              if (isRightChoice) {
                // Correct answer revealed
                btnClasses = 'bg-emerald-50/95 text-emerald-950 border-emerald-400 shadow-[inset_0_0_0_1.5px_#10b981,0_2px_8px_rgba(16,185,129,0.15)] ring-1 ring-emerald-300';
                badgeClasses = 'bg-emerald-500 text-white border-emerald-600';
              } else if (isWrongChoice) {
                // Wrong answer selected
                btnClasses = 'bg-rose-50/95 text-rose-950 border-rose-400 shadow-[inset_0_0_0_1.5px_#f43f5e,0_2px_8px_rgba(244,63,94,0.15)] ring-1 ring-rose-300';
                badgeClasses = 'bg-rose-500 text-white border-rose-600';
              } else if (isSelected) {
                // Selected before submitting
                btnClasses = 'bg-sky-50 text-sky-950 border-sky-400 shadow-[inset_0_0_0_1.5px_#0284c7,0_2px_8px_rgba(2,132,199,0.15)] ring-1 ring-sky-300';
                badgeClasses = 'bg-sky-600 text-white border-sky-700';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswerSubmitted}
                  className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all duration-150 flex items-start gap-3 cursor-pointer select-none disabled:cursor-default ${btnClasses}`}
                >
                  {/* Option Letter Pill (A, B, C, D) */}
                  <span
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl border flex items-center justify-center text-[11px] font-black shrink-0 transition-colors shadow-2xs ${badgeClasses}`}
                  >
                    {isRightChoice ? (
                      <Check size={14} weight="bold" />
                    ) : isWrongChoice ? (
                      <XCircle size={14} weight="fill" />
                    ) : (
                      getOptionLetter(idx)
                    )}
                  </span>

                  {/* Option Text */}
                  <span className="flex-1 leading-relaxed pt-0.5">
                    {optionText}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Explanation Card (Appears after submission) */}
          {isAnswerSubmitted && currentQuestion.explanation && (
            <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-[inset_1px_1px_2px_#ffffff] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-zinc-900">
                <Sparkle size={14} weight="fill" className="text-sky-600" />
                <span>Explanation</span>
              </div>
              <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Bottom Action Button */}
          <div className="mt-6">
            {!isAnswerSubmitted ? (
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border border-zinc-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.25)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Submit Answer</span>
                <Check size={16} weight="bold" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-b from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border border-sky-400/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_4px_12px_rgba(14,165,233,0.35)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>
                  {currentQuestionIndex + 1 < totalQuestions ? 'Next Question' : 'Finish Quest'}
                </span>
                <ArrowRight size={16} weight="bold" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: QUESTS CATALOG / HUB SCREEN
  // =========================================================================
  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-16 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-white/90 shadow-[inset_1px_1px_2px_#ffffff,0_2px_6px_rgba(0,0,0,0.04)] mb-2">
          <Sparkle size={13} weight="fill" className="text-sky-600" />
          <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-zinc-600 font-sans">
            Arena Knowledge Duels
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-arena">
          Quests & Quizzes
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1 max-w-md mx-auto">
          Complete client-side quiz quests to test your clinical, tactical, and deep-tech acumen and earn Arena points.
        </p>
      </div>

      {/* Overview Metric Bar */}
      <div className="grid grid-cols-3 gap-2.5 p-2 rounded-2xl bg-[#ebedf2] border border-white/90 shadow-[inset_2px_2px_5px_#ffffff,inset_-2px_-2px_5px_#c5ccd6] mb-6">
        <div className="p-3 rounded-xl bg-white/80 border border-white flex flex-col items-center text-center shadow-xs">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Available</span>
          <span className="text-lg sm:text-xl font-black text-zinc-900 mt-0.5">{QUESTS.length}</span>
        </div>
        <div className="p-3 rounded-xl bg-white/80 border border-white flex flex-col items-center text-center shadow-xs">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Completed</span>
          <span className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">{completedCount}</span>
        </div>
        <div className="p-3 rounded-xl bg-white/80 border border-white flex flex-col items-center text-center shadow-xs">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Points Won</span>
          <span className="text-lg sm:text-xl font-black text-sky-600 mt-0.5">+{totalEarnedPoints}</span>
        </div>
      </div>

      {/* Quests List */}
      <div className="space-y-3.5">
        {QUESTS.map((quest) => {
          const scoreInfo = questScores[quest.id];
          const isCompleted = Boolean(scoreInfo && scoreInfo.score > 0);
          const scoreAchieved = scoreInfo?.score || 0;
          const correctAchieved = scoreInfo?.correctCount || 0;

          return (
            <div
              key={quest.id}
              className="rounded-[24px] sm:rounded-[28px] bg-[#ebedf2] border border-white/90 p-4.5 sm:p-5 shadow-[inset_3px_3px_6px_#ffffff,inset_-3px_-3px_6px_#c5ccd6,0_8px_20px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-[inset_2px_2px_4px_#ffffff,inset_-2px_-2px_4px_#c5ccd6,0_12px_28px_rgba(0,0,0,0.08)]"
            >
              {/* Top Row: Icon, Category, Difficulty, Reward Tag */}
              <div className="flex items-center justify-between gap-2.5 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#ebedf2] border border-white/90 shadow-[inset_2px_2px_4px_#c8d0db,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center shrink-0">
                    <QuestIcon name={quest.iconName} size={22} className="text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-zinc-600 border border-slate-200/80 shadow-2xs">
                      {quest.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200/80">
                    +{quest.totalPoints} PTS
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-sm sm:text-base font-black text-zinc-900 tracking-tight leading-snug">
                {quest.title}
              </h3>
              <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
                {quest.description}
              </p>

              {/* Footer Row: Status & Start Button */}
              <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {isCompleted ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                      <CheckCircle size={14} weight="fill" className="text-emerald-600 shrink-0" />
                      <span className="truncate">
                        Completed: {correctAchieved}/{quest.questions.length} ({scoreAchieved} PTS)
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11.5px] font-semibold text-zinc-500">
                      {quest.questions.length} questions • ~3 mins
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleStartQuest(quest)}
                  className={`py-2 px-3.5 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
                    isCompleted
                      ? 'bg-white hover:bg-slate-50 text-zinc-800 border border-slate-200 shadow-[inset_0_1px_2px_#ffffff,0_2px_4px_rgba(0,0,0,0.05)]'
                      : 'bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 text-white border border-zinc-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.22)]'
                  }`}
                >
                  <span>{isCompleted ? 'Replay' : 'Start Quest'}</span>
                  <ArrowRight size={14} weight="bold" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestsView;
