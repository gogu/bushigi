import React, { useMemo } from 'react';
import { Volume2, CheckCircle2, Flame, Star, BookOpen, Trash2 } from 'lucide-react';
import { WORD_DECKS } from '../../data/wordDecks';
import { gameAudio, speakJapanese } from '../../engine/audio';
import { saveStore, usePlayerSave } from '../../engine/saveStore';
import { CharacterMood } from '../../components/ShopkeeperAvatar';
import { WordIllustration } from '../../components/WordIllustration';

interface WordMasteryPanelProps {
  deckId: string;
  onStartReviewDrill: () => void;
  onMoodChange: (mood: CharacterMood, speech?: string) => void;
}

export const WordMasteryPanel: React.FC<WordMasteryPanelProps> = ({
  deckId,
  onStartReviewDrill,
  onMoodChange,
}) => {
  const save = usePlayerSave();
  const activeDeck = WORD_DECKS.find((d) => d.id === deckId) || WORD_DECKS[0];

  const stats = useMemo(() => {
    let masteredCount = 0; // stars >= 1 and !needsReview
    let perfectCount = 0;  // stars === 3
    let hiraCorrect = 0;
    let hiraTotal = 0;
    let kataCorrect = 0;
    let kataTotal = 0;

    for (const w of activeDeck.words) {
      const rec = save.wordMastery[w.id];
      if (!rec) continue;
      if (rec.stars >= 1 && !rec.needsReview) masteredCount++;
      if (rec.stars >= 3) perfectCount++;

      const tot = rec.correctCount + rec.wrongCount;
      if (w.scriptType === 'hiragana') {
        hiraCorrect += rec.correctCount;
        hiraTotal += tot;
      } else {
        kataCorrect += rec.correctCount;
        kataTotal += tot;
      }
    }

    const reviewList = activeDeck.words.filter((w) => save.wordMastery[w.id]?.needsReview);
    const totalWords = activeDeck.words.length;
    const progressPercent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

    return {
      masteredCount,
      perfectCount,
      totalWords,
      progressPercent,
      hiraAccuracy: hiraTotal > 0 ? Math.round((hiraCorrect / hiraTotal) * 100) : 100,
      kataAccuracy: kataTotal > 0 ? Math.round((kataCorrect / kataTotal) * 100) : 100,
      hiraPracticed: hiraTotal,
      kataPracticed: kataTotal,
      reviewList,
    };
  }, [activeDeck.words, save.wordMastery]);

  return (
    <div className="flex-1 overflow-y-auto game-scroll space-y-4 pr-1">
      {/* Top Mastery Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Progress */}
        <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-aiiro">📚 デッキ習得状況</span>
            <span className="text-xs font-black text-shuiro">{stats.progressPercent}%</span>
          </div>
          <div className="text-2xl font-black text-sumi mb-2">
            {stats.masteredCount} / {stats.totalWords} 語 習得
          </div>
          <div className="w-full h-3 bg-washi-dark rounded-full overflow-hidden border border-aiiro">
            <div
              className="h-full bg-gradient-to-r from-matcha to-kohaku transition-all duration-500"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
          <div className="mt-2 text-xs font-bold text-sumi-muted flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-kohaku fill-kohaku" />
            <span>満点(★★★)単語：{stats.perfectCount} 語</span>
          </div>
        </div>

        {/* Hiragana vs Katakana Breakdown */}
        <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card flex flex-col justify-between gap-2">
          <div className="text-xs font-black text-aiiro">🔤 文字タイプ別 正解率</div>
          <div className="space-y-2">
            <div className="bg-washi border border-washi-border rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-extrabold text-matcha-dark">あ 平仮名ワード</span>
              <span className="text-sm font-black text-sumi">
                {stats.hiraPracticed > 0 ? `${stats.hiraAccuracy}% (${stats.hiraPracticed}回)` : '未受験'}
              </span>
            </div>
            <div className="bg-washi border border-washi-border rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-extrabold text-kohaku-dark">ア カタカナ外来語</span>
              <span className="text-sm font-black text-sumi">
                {stats.kataPracticed > 0 ? `${stats.kataAccuracy}% (${stats.kataPracticed}回)` : '未受験'}
              </span>
            </div>
          </div>
        </div>

        {/* Weakness Drill CTA */}
        <div className="bg-aiiro text-washi-light border-4 border-aiiro-dark rounded-3xl p-4 shadow-game-card flex flex-col justify-between">
          <div>
            <div className="text-xs font-black text-kohaku-light mb-1 flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>📕 スペル弱点ノート</span>
            </div>
            <div className="text-2xl font-black">
              要復習：{stats.reviewList.length} 語
            </div>
            <p className="text-xs text-washi-dark mt-1 font-bold">
              間違えた単語は自動でここに記録され、正解するとリストから卒業します！
            </p>
          </div>
          <button
            onClick={() => {
              gameAudio.playCashRegister();
              onStartReviewDrill();
            }}
            className="game-btn mt-3 w-full flex items-center justify-center gap-1.5 bg-shuiro hover:bg-shuiro-light text-white font-black text-xs sm:text-sm py-2.5 rounded-2xl border-2 border-washi-light/30 shadow-game-btn"
          >
            <Flame className="w-4 h-4" />
            <span>
              {stats.reviewList.length > 0
                ? `弱点 ${stats.reviewList.length} 語を特訓する！`
                : '全単語から検品スタート！'}
            </span>
          </button>
        </div>
      </div>

      {/* Review Words List */}
      <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 sm:p-5 shadow-game-card">
        <h3 className="text-sm font-black text-aiiro mb-3 flex items-center gap-2">
          <span>📝 要復習・スペルミス履歴（{stats.reviewList.length} 件）</span>
        </h3>

        {stats.reviewList.length === 0 ? (
          <div className="bg-matcha/10 border-2 border-dashed border-matcha rounded-2xl p-6 text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-matcha mx-auto" />
            <div className="text-sm font-black text-matcha-dark">
              要復習の単語はありません！このまま全単語マスターを目指そう♪
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.reviewList.map((w) => {
              const rec = save.wordMastery[w.id];
              return (
                <div
                  key={w.id}
                  className="bg-washi border-2 border-shuiro/50 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <WordIllustration
                      src={w.imageUrl}
                      alt={w.meaning}
                      fallbackEmoji={w.emoji}
                      size="xs"
                    />
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-aiiro">{w.display}</span>
                        <span className="text-sm font-black text-shuiro">({w.reading})</span>
                        {rec?.lastWrongInput && (
                          <span className="text-[11px] font-bold bg-shuiro/15 text-shuiro px-2 py-0.5 rounded-md">
                            前回: {rec.lastWrongInput}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-sumi-muted">
                        {w.meaning} · {w.spellingTip}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => speakJapanese(w.reading, 0.9)}
                      className="game-btn bg-kohaku text-sumi p-2 rounded-xl border border-aiiro"
                      title="発音を聴く"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        gameAudio.playClick();
                        saveStore.clearWordReview(w.id);
                        onMoodChange('happy', `「${w.display}」を克服済みにしたよ！`);
                      }}
                      className="game-btn bg-washi-dark hover:bg-matcha hover:text-white text-sumi-muted p-2 rounded-xl border border-washi-border"
                      title="復習リストから外す"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
