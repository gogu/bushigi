import React, { useEffect, useState } from 'react';
import { PenTool, Grid, BarChart3 } from 'lucide-react';
import { CharacterMood, ShopkeeperAvatar } from '../../components/ShopkeeperAvatar';
import { WORD_DECKS } from '../../data/wordDecks';
import { gameAudio } from '../../engine/audio';
import { SpellingCheckArena } from './SpellingCheckArena';
import { WordFlashcardGallery } from './WordFlashcardGallery';
import { WordMasteryPanel } from './WordMasteryPanel';

export type WordShopStation = 'arena' | 'gallery' | 'mastery';

interface WordSpellingShopGameProps {
  initialStation?: WordShopStation;
  forceReviewMode?: boolean;
  onClearForceReviewMode?: () => void;
}

export const WordSpellingShopGame: React.FC<WordSpellingShopGameProps> = ({
  initialStation = 'arena',
  forceReviewMode,
  onClearForceReviewMode,
}) => {
  const [station, setStation] = useState<WordShopStation>(initialStation);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(WORD_DECKS[0].id);
  const [localForceReview, setLocalForceReview] = useState<boolean>(Boolean(forceReviewMode));
  const [mood, setMood] = useState<CharacterMood>('happy');
  const [speech, setSpeech] = useState<string>(
    'ようこそ「ことば・つづり屋」へ！ここでは単語の仮名スペルを一文字ずつ検品チェックして、長音や濁音のミスを撃退しよう♪'
  );

  useEffect(() => {
    setStation(initialStation);
  }, [initialStation]);

  useEffect(() => {
    if (forceReviewMode) {
      setStation('arena');
      setLocalForceReview(true);
    }
  }, [forceReviewMode]);

  const handleMoodChange = (nextMood: CharacterMood, nextSpeech?: string) => {
    setMood(nextMood);
    if (nextSpeech) {
      setSpeech(nextSpeech);
    }
  };

  const handleClearReviewTrigger = () => {
    setLocalForceReview(false);
    onClearForceReviewMode?.();
  };

  return (
    <div className="flex-1 h-full flex flex-col px-3 sm:px-6 py-3 max-w-7xl mx-auto w-full gap-3 overflow-hidden">
      {/* Top Shop Counter Header: Character + 3 Game Station Switcher */}
      <div className="bg-washi-light border-4 border-aiiro rounded-3xl px-4 py-2.5 shadow-game-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shrink-0">
        <ShopkeeperAvatar
          mood={mood}
          size="sm"
          speechText={speech}
          characterName="活版職人 コハル & ぽん太"
        />

        {/* 3 Core Stations Switcher */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end shrink-0">
          <button
            onClick={() => {
              gameAudio.playClick();
              setStation('arena');
              handleMoodChange(
                'excited',
                '『活字検品台』へようこそ！ローマ字入力でも活字ブロックでもスペルチェックできるよ！'
              );
            }}
            className={`game-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all ${
              station === 'arena'
                ? 'bg-shuiro text-white border-aiiro-dark shadow-game-btn scale-[1.02]'
                : 'bg-washi text-sumi-muted border-washi-border hover:text-sumi'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>① 活字検品台（拼写）</span>
          </button>

          <button
            onClick={() => {
              gameAudio.playPageFlip();
              setStation('gallery');
              handleMoodChange(
                'happy',
                '『詞カード図鑑』だよ！4×5の単語カードをクリックすると発音が聴けて、自測モードも使えるよ！'
              );
            }}
            className={`game-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all ${
              station === 'gallery'
                ? 'bg-matcha text-white border-aiiro-dark shadow-game-btn scale-[1.02]'
                : 'bg-washi text-sumi-muted border-washi-border hover:text-sumi'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>② 詞カード図鑑（4×5）</span>
          </button>

          <button
            onClick={() => {
              gameAudio.playClick();
              setStation('mastery');
              handleMoodChange(
                'happy',
                '『熟練度・弱点帳』だよ！平仮名・カタカナ別の正解率や、苦手な単語をまとめてチェックしよう！'
              );
            }}
            className={`game-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all ${
              station === 'mastery'
                ? 'bg-kohaku text-sumi border-aiiro-dark shadow-game-btn scale-[1.02]'
                : 'bg-washi text-sumi-muted border-washi-border hover:text-sumi'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>③ 熟練度・弱点帳</span>
          </button>
        </div>
      </div>

      {/* Active Station Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {station === 'arena' && (
          <SpellingCheckArena
            deckId={selectedDeckId}
            onChangeDeckId={setSelectedDeckId}
            onMoodChange={handleMoodChange}
            forceReviewMode={localForceReview}
            onClearForceReviewMode={handleClearReviewTrigger}
          />
        )}
        {station === 'gallery' && (
          <WordFlashcardGallery
            deckId={selectedDeckId}
            onMoodChange={handleMoodChange}
          />
        )}
        {station === 'mastery' && (
          <WordMasteryPanel
            deckId={selectedDeckId}
            onStartReviewDrill={() => {
              setStation('arena');
              setLocalForceReview(true);
            }}
            onMoodChange={handleMoodChange}
          />
        )}
      </div>
    </div>
  );
};
