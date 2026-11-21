import { supabase } from '../utils/supabase';
import { getPlayerUuid, getPlayerId } from '../utils/playerId';

const STORAGE_PREFIX = 'arena_quest_score_';

/**
 * Get all cached quest scores from local storage for instant 0ms rendering
 */
export function getLocalQuestScores(playerId) {
  if (typeof window === 'undefined') return {};
  try {
    const key = `${STORAGE_PREFIX}${playerId || 'guest'}`;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save quest score locally
 */
export function saveLocalQuestScore(playerId, questId, scoreData) {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_PREFIX}${playerId || 'guest'}`;
    const current = getLocalQuestScores(playerId);
    current[questId] = {
      ...scoreData,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('arena:quest-completed', { detail: { questId, ...scoreData } }));
  } catch (e) {
    console.warn('[QuestService] saveLocalQuestScore failed:', e);
  }
}

/**
 * Fetch all quest scores for a player from Supabase with local cache fallback
 */
export async function fetchPlayerQuestScores(playerId) {
  const pId = playerId || getPlayerUuid();
  const localScores = getLocalQuestScores(pId);

  if (!pId) {
    return { success: true, data: localScores };
  }

  try {
    const { data, error } = await supabase
      .from('quest_scores')
      .select('quest_id, score, correct_count, total_questions, completed_at, updated_at')
      .eq('player_id', pId);

    if (error) {
      // Return local cache if table doesn't exist yet
      return { success: true, data: localScores, source: 'cache' };
    }

    const merged = { ...localScores };
    if (data && Array.isArray(data)) {
      data.forEach((row) => {
        merged[row.quest_id] = {
          score: Number(row.score || 0),
          correctCount: Number(row.correct_count || 0),
          totalQuestions: Number(row.total_questions || 10),
          completedAt: row.completed_at || row.updated_at,
        };
      });
      // Synchronize back to local cache
      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${pId}`, JSON.stringify(merged));
      } catch {}
    }

    return { success: true, data: merged, source: 'supabase' };
  } catch (err) {
    console.warn('[QuestService] fetchPlayerQuestScores fallback:', err);
    return { success: true, data: localScores, source: 'cache' };
  }
}

/**
 * Records a completed quest score in Supabase and local storage
 * Updates player total_score based on correct answer counts
 */
export async function recordQuestScore({
  playerId,
  guestId,
  questId,
  score,
  correctCount,
  totalQuestions,
}) {
  const pId = playerId || getPlayerUuid();
  const gId = guestId || getPlayerId() || 'Guest';

  // 1. Immediately cache locally
  saveLocalQuestScore(pId, questId, {
    score,
    correctCount,
    totalQuestions,
  });

  if (!pId) {
    return { success: true, cached: true };
  }

  try {
    // 2. Try Atomic RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('record_quest_score', {
      p_player_id: pId,
      p_guest_id: gId,
      p_quest_id: questId,
      p_score: score,
      p_correct_count: correctCount,
      p_total_questions: totalQuestions,
    });

    if (!rpcError && rpcData?.success) {
      return { success: true, data: rpcData };
    }

    // 3. Direct upsert fallback into quest_scores
    const { data: upsertData, error: upsertError } = await supabase
      .from('quest_scores')
      .upsert(
        {
          player_id: pId,
          guest_id: gId,
          quest_id: questId,
          score,
          correct_count: correctCount,
          total_questions: totalQuestions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id,quest_id' }
      )
      .select()
      .maybeSingle();

    if (upsertError) {
      console.warn('[QuestService] quest_scores direct upsert warning:', upsertError.message);
    }

    // 4. Also increment player total_score if score > 0
    if (score > 0) {
      try {
        const { data: playerRow } = await supabase
          .from('players')
          .select('total_score')
          .eq('id', pId)
          .maybeSingle();

        const currentTotal = Number(playerRow?.total_score || 0);
        await supabase
          .from('players')
          .update({
            total_score: currentTotal + score,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pId);

        // Record in wallet_transactions
        await supabase.from('wallet_transactions').insert({
          player_id: pId,
          amount: score,
          type: 'quest_reward',
          description: `Completed Quest: ${questId}`,
          metadata: { quest_id: questId, correct_count: correctCount, total_questions: totalQuestions },
        });
      } catch (err) {
        console.warn('[QuestService] Player score increment warning:', err);
      }
    }

    return {
      success: true,
      data: upsertData || { score, correctCount },
    };
  } catch (err) {
    console.warn('[QuestService] recordQuestScore error (cached locally):', err);
    return { success: true, cached: true, error: err.message };
  }
}
