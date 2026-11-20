import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Volume2, Star, Sparkles } from 'lucide-react';
import { WORD_DECKS, WordEntry } from '../../data/wordDecks';
import { gameAudio, speakJapanese } from '../../engine/audio';
import { usePlayerSave } from '../../engine/saveStore';
import { CharacterMood } from '../../components/ShopkeeperAvatar';
import { WordIllustration } from '../../components/WordIllustration';

interface WordFlashcardGalleryProps {
  deckId: string;
  onMoodChange: (mood: CharacterMood, speech?: string) => void;
}

type GalleryFilter = 'all' | 'hiragana' | 'katakana' | 'review';

export const WordFlashcardGallery: React.FC<WordFlashcardGalleryProps> = ({
  deckId,
  onMoodChange,
}) => {
  const save = usePlayerSave();
  const activeDeck = WORD_DECKS.find((d) => d.id === deckId) || WORD_DECKS[0];

  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [hideReadings, setHideReadings] = useState<boolean>(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [selectedWord, setSelectedWord] = useState<WordEntry>(activeDeck.words[0]);

  const filteredWords = useMemo(() => {
    if (filter === 'hiragana') return activeDeck.words.filter((w) => w.scriptType === 'hiragana');
    if (filter === 'katakana') return activeDeck.words.filter((w) => w.scriptType === 'katakana');
    if (filter === 'review') return activeDeck.words.filter((w) => save.wordMastery[w.id]?.needsReview);
    return activeDeck.words;
  }, [activeDeck.words, filter, save.wordMastery]);

  const toggleHideMode = () => {
    gameAudio.playPageFlip();
    const next = !hideReadings;
    setHideReadings(next);
    setRevealedIds(new Set());
    onMoodChange(
      'happy',
      next
        ? '自測モードON！読み仮名を隠したよ。カードをクリックしてめくりながら発音をチェックしよう！'
        : '全カード表示モードに戻したよ！好きなカードをクリックすると発音とコツが聴けるよ♪'
    );
  };

  const handleCardClick = (word: WordEntry) => {
    gameAudio.playClick();
    setSelectedWord(word);
    speakJapanese(word.reading, 0.95);

    if (hideReadings) {
      setRevealedIds((prev) => {
        const next = new Set(prev);
        if (next.has(word.id)) next.delete(word.id);
        else next.add(word.id);
        return next;
      });
    }
    onMoodChange('happy', `『${word.display}』＝「${word.reading}」（${word.meaning}）。${word.spellingTip}`);
  };

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden h-full">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-washi-light border-2 border-aiiro rounded-2xl p-2 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `🃏 すべて (${activeDeck.words.length})` },
            {
              id: 'hiragana',
              label: `あ 平仮名 (${activeDeck.words.filter((w) => w.scriptType === 'hiragana').length})`,
            },
            {
              id: 'katakana',
              label: `ア 片仮名 (${activeDeck.words.filter((w) => w.scriptType === 'katakana').length})`,
            },
            {
              id: 'review',
              label: `📕 要復習 (${
                activeDeck.words.filter((w) => save.wordMastery[w.id]?.needsReview).length
              })`,
            },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                gameAudio.playClick();
                setFilter(btn.id as GalleryFilter);
              }}
              className={`game-btn px-3 py-1.5 rounded-xl font-extrabold text-xs border-2 ${
                filter === btn.id
                  ? 'bg-matcha text-white border-aiiro-dark shadow-game-btn'
                  : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <button
          onClick={toggleHideMode}
          className={`game-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs border-2 shadow-game-btn ${
            hideReadings
              ? 'bg-shuiro text-white border-aiiro-dark'
              : 'bg-kohaku hover:bg-kohaku-light text-sumi border-aiiro-dark'
          }`}
        >
          {hideReadings ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span>{hideReadings ? '🙈 読みをすべて表示する' : '🙈 読みを隠す（自測モード）'}</span>
        </button>
      </div>

      {/* Selected Card Detail Inspector */}
      <div className="bg-aiiro text-washi-light border-2 border-aiiro-dark rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <WordIllustration
            src={selectedWord.imageUrl}
            alt={selectedWord.meaning}
            fallbackEmoji={selectedWord.emoji}
            size="sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-kohaku-light">
                {hideReadings && !revealedIds.has(selectedWord.id)
                  ? `${selectedWord.meaning}（読み非表示中）`
                  : `${selectedWord.display}（${selectedWord.reading}）`}
              </span>
              <span className="text-xs font-bold text-washi-dark">— {selectedWord.meaning}</span>
            </div>
            <div className="text-xs font-bold text-washi-dark/90">
              💡 {selectedWord.spellingTip}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => speakJapanese(selectedWord.reading, 0.95)}
            className="game-btn flex items-center gap-1 bg-shuiro hover:bg-shuiro-light text-white font-extrabold text-xs px-3 py-1.5 rounded-xl border border-washi-light/30"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>単語発音</span>
          </button>
          <button
            onClick={() => speakJapanese(selectedWord.exampleJp, 0.95)}
            className="game-btn flex items-center gap-1 bg-kohaku hover:bg-kohaku-light text-sumi font-extrabold text-xs px-3 py-1.5 rounded-xl border border-aiiro-dark"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>例文発音</span>
          </button>
        </div>
      </div>

      {/* 4x5 Flashcard Grid */}
      <div className="flex-1 overflow-y-auto game-scroll pr-1">
        {filteredWords.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-washi-light border-4 border-aiiro rounded-3xl p-8 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-base font-black text-aiiro">現在、要復習マークが付いた単語はありません！</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-2">
            {filteredWords.map((word) => {
              const mastery = save.wordMastery[word.id];
              const stars = mastery?.stars ?? 0;
              const needsReview = mastery?.needsReview ?? false;
              const isSelected = selectedWord.id === word.id;
              const isMasked = hideReadings && !revealedIds.has(word.id);

              return (
                <motion.button
                  key={word.id}
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCardClick(word)}
                  className={`text-left rounded-3xl border-4 p-3.5 flex flex-col justify-between gap-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-washi-light border-shuiro shadow-game-card'
                      : needsReview
                      ? 'bg-shuiro/5 border-shuiro/60 shadow-sm hover:border-shuiro'
                      : 'bg-washi-light border-aiiro shadow-sm hover:border-kohaku-dark'
                  }`}
                >
                  {/* Top Row: Script Badge + Stars */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                        word.scriptType === 'katakana'
                          ? 'bg-kohaku/30 text-sumi border-kohaku-dark'
                          : 'bg-matcha/15 text-matcha-dark border-matcha'
                      }`}
                    >
                      {word.scriptType === 'katakana' ? '片仮名' : '平仮名'}
                    </span>

                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= stars
                              ? 'text-kohaku fill-kohaku'
                              : 'text-washi-border'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Center Card Face */}
                  <div className="text-center py-1 flex-1 flex flex-col items-center justify-center w-full gap-1.5">
                    {isMasked ? (
                      <>
                        <WordIllustration
                          src={word.imageUrl}
                          alt={word.meaning}
                          fallbackEmoji={word.emoji}
                          size="md"
                        />
                        <div className="text-sm font-black text-aiiro">{word.meaning}</div>
                        <div className="text-[11px] font-extrabold bg-aiiro/10 text-aiiro px-2.5 py-0.5 rounded-full">
                          タップで答えを見る
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="text-lg sm:text-xl font-black text-aiiro leading-tight">
                            {word.display}
                          </div>
                          {word.scriptType === 'hiragana' && (
                            <div className="text-xs sm:text-sm font-extrabold text-shuiro">
                              {word.reading}
                            </div>
                          )}
                        </div>
                        <WordIllustration
                          src={word.imageUrl}
                          alt={word.meaning}
                          fallbackEmoji={word.emoji}
                          size="md"
                        />
                        <div className="text-xs font-bold text-sumi-muted">{word.meaning}</div>
                      </>
                    )}
                  </div>

                  {/* Bottom Review Pill if applicable */}
                  {needsReview && (
                    <div className="text-[10px] font-black text-center bg-shuiro text-white rounded-lg py-0.5">
                      要復習
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
