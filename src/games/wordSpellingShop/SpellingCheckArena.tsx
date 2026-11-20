import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import * as wanakana from 'wanakana';
import {
  Volume2,
  Turtle,
  Send,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Flame,
  Keyboard,
  Puzzle,
  RotateCcw,
  Delete,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { WORD_DECKS, WordEntry } from '../../data/wordDecks';
import {
  LetterTile,
  SpellingCheckResult,
  checkJapaneseSpelling,
  convertLiveInput,
  generateTilePool,
} from '../../engine/spellingChecker';
import { gameAudio, speakJapanese } from '../../engine/audio';
import { saveStore, usePlayerSave } from '../../engine/saveStore';
import { CharacterMood } from '../../components/ShopkeeperAvatar';
import { WordIllustration } from '../../components/WordIllustration';

export type ScopeFilter = 'all' | 'hiragana' | 'katakana' | 'review';
export type PromptMode = 'image' | 'kanji' | 'meaning' | 'audio' | 'mixed';
export type InputMode = 'keyboard' | 'tiles';

interface SpellingCheckArenaProps {
  deckId: string;
  onChangeDeckId: (id: string) => void;
  onMoodChange: (mood: CharacterMood, speech?: string) => void;
  forceReviewMode?: boolean;
  onClearForceReviewMode?: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const SpellingCheckArena: React.FC<SpellingCheckArenaProps> = ({
  deckId,
  onChangeDeckId,
  onMoodChange,
  forceReviewMode,
  onClearForceReviewMode,
}) => {
  const save = usePlayerSave();
  const activeDeck = WORD_DECKS.find((d) => d.id === deckId) || WORD_DECKS[0];

  const [scope, setScope] = useState<ScopeFilter>('all');
  const [promptMode, setPromptMode] = useState<PromptMode>('image');
  const [inputMode, setInputMode] = useState<InputMode>('keyboard');

  // Round session state
  const [queue, setQueue] = useState<WordEntry[]>(() => shuffleArray(activeDeck.words));
  const [promptPlan, setPromptPlan] = useState<Array<'image' | 'kanji' | 'meaning' | 'audio'>>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [roundSeed, setRoundSeed] = useState<number>(0);

  // Per-card input & check state
  const [inputText, setInputText] = useState<string>('');
  const [tilePool, setTilePool] = useState<LetterTile[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<LetterTile[]>([]);
  const [checkResult, setCheckResult] = useState<SpellingCheckResult | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showLengthSlots, setShowLengthSlots] = useState<boolean>(false);

  // Score tracking
  const [combo, setCombo] = useState<number>(0);
  const [roundCorrect, setRoundCorrect] = useState<number>(0);
  const [roundMistakes, setRoundMistakes] = useState<WordEntry[]>([]);
  const [roundFinished, setRoundFinished] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);

  // Count words needing review in current deck
  const reviewWords = useMemo(
    () => activeDeck.words.filter((w) => save.wordMastery[w.id]?.needsReview),
    [activeDeck.words, save.wordMastery]
  );

  // Apply forced review mode when triggered from HUD or Mastery Panel
  useEffect(() => {
    if (forceReviewMode) {
      if (reviewWords.length > 0) {
        setScope('review');
        setRoundSeed((s) => s + 1);
      } else {
        onMoodChange('happy', '現在、弱点単語はありません！全単語からテストしよう♪');
        setScope('all');
        setRoundSeed((s) => s + 1);
      }
      onClearForceReviewMode?.();
    }
  }, [forceReviewMode, reviewWords.length, onClearForceReviewMode, onMoodChange]);

  // Build filtered queue whenever deck, scope, or roundSeed changes
  useEffect(() => {
    let baseList = activeDeck.words;
    if (scope === 'hiragana') {
      baseList = activeDeck.words.filter((w) => w.scriptType === 'hiragana');
    } else if (scope === 'katakana') {
      baseList = activeDeck.words.filter((w) => w.scriptType === 'katakana');
    } else if (scope === 'review') {
      const revs = activeDeck.words.filter((w) => save.wordMastery[w.id]?.needsReview);
      baseList = revs.length > 0 ? revs : activeDeck.words;
    }

    const shuffled = shuffleArray(baseList);
    const modes: Array<'image' | 'kanji' | 'meaning' | 'audio'> = ['image', 'kanji', 'meaning', 'audio'];
    const plan = shuffled.map((_, idx) => modes[idx % modes.length]);

    setQueue(shuffled);
    setPromptPlan(plan);
    setQueueIndex(0);
    setRoundCorrect(0);
    setRoundMistakes([]);
    setRoundFinished(false);
    setCheckResult(null);
    setInputText('');
    setSelectedTiles([]);
    setShowHint(false);
    setShowLengthSlots(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeck.id, scope, roundSeed]);

  const currentWord: WordEntry | undefined = queue[queueIndex];
  const effectivePrompt: 'image' | 'kanji' | 'meaning' | 'audio' =
    promptMode === 'mixed' ? promptPlan[queueIndex] || 'image' : promptMode;

  // Reset per-card state when advancing to next card
  useEffect(() => {
    if (!currentWord || roundFinished) return;
    setInputText('');
    setSelectedTiles([]);
    setTilePool(generateTilePool(currentWord));
    setCheckResult(null);
    setShowHint(false);
    setShowLengthSlots(false);

    if (effectivePrompt === 'audio') {
      const timer = setTimeout(() => {
        speakJapanese(currentWord.reading, 0.95);
      }, 180);
      return () => clearTimeout(timer);
    }
    if (inputMode === 'keyboard') {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueIndex, currentWord?.id, roundFinished]);

  // Re-focus keyboard input when toggling to keyboard mode
  useEffect(() => {
    if (inputMode === 'keyboard' && (!checkResult || checkResult.isAlternateRetry)) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inputMode, checkResult]);

  const currentAnswerDraft =
    inputMode === 'keyboard' ? inputText : selectedTiles.map((t) => t.char).join('');

  const handleLiveKeyboardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentWord) return;
    const converted = convertLiveInput(e.target.value, currentWord.scriptType);
    setInputText(converted);
  };

  const handleInsertLongVowel = () => {
    if (!currentWord) return;
    gameAudio.playClick();
    setInputText((prev) => prev + 'ー');
    inputRef.current?.focus();
  };

  const handleTilePick = (tile: LetterTile) => {
    if (checkResult && !checkResult.isAlternateRetry) return;
    gameAudio.playClick();
    setSelectedTiles((prev) => [...prev, tile]);
  };

  const handleTileRemoveAt = (idx: number) => {
    if (checkResult && !checkResult.isAlternateRetry) return;
    gameAudio.playClick();
    setSelectedTiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentWord) return;
    if (checkResult && !checkResult.isAlternateRetry) {
      handleNext();
      return;
    }
    if (!currentAnswerDraft.trim()) return;

    const result = checkJapaneseSpelling(currentAnswerDraft, currentWord);
    setCheckResult(result);

    if (result.isAlternateRetry) {
      gameAudio.playPageFlip();
      setInputText('');
      setSelectedTiles([]);
      onMoodChange('thinking', result.diagnostics[0]?.detail);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    if (result.isCorrect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setRoundCorrect((c) => c + 1);
      gameAudio.playSuccess(nextCombo);
      speakJapanese(currentWord.reading, 0.95);
      saveStore.recordWordResult(currentWord.id, true, nextCombo);

      if (nextCombo >= 3) {
        confetti({ particleCount: 40, spread: 58, origin: { y: 0.72 } });
      }
      onMoodChange(
        nextCombo >= 3 ? 'excited' : 'happy',
        `検品合格！「${currentWord.display}」＝『${currentWord.reading}』完璧だよ！（${nextCombo}連続コンボ）`
      );
    } else {
      setCombo(0);
      setRoundMistakes((prev) =>
        prev.some((w) => w.id === currentWord.id) ? prev : [...prev, currentWord]
      );
      gameAudio.playError();
      speakJapanese(currentWord.reading, 0.9);
      saveStore.recordWordResult(currentWord.id, false, 0, result.normalizedInput);

      const firstDiag = result.diagnostics[0];
      onMoodChange(
        'oops',
        firstDiag
          ? `${firstDiag.title}：${firstDiag.detail}`
          : `惜しいっ！「${currentWord.display}」の正しい綴りは『${currentWord.reading}』だよ。`
      );
    }

    setTimeout(() => nextBtnRef.current?.focus(), 40);
  };

  const handleNext = () => {
    gameAudio.playPageFlip();
    if (queueIndex + 1 >= queue.length) {
      setRoundFinished(true);
      const rate = queue.length > 0 ? Math.round((roundCorrect / queue.length) * 100) : 100;
      onMoodChange(
        rate >= 80 ? 'excited' : 'happy',
        `検品ラウンド完了！正解率は ${rate}% だったよ！お疲れさま♪`
      );
    } else {
      setQueueIndex((i) => i + 1);
    }
  };

  const handleRestartWithList = (customList?: WordEntry[]) => {
    gameAudio.playCashRegister();
    if (customList && customList.length > 0) {
      const shuffled = shuffleArray(customList);
      const modes: Array<'image' | 'kanji' | 'meaning' | 'audio'> = ['image', 'kanji', 'meaning', 'audio'];
      setQueue(shuffled);
      setPromptPlan(shuffled.map((_, idx) => modes[idx % modes.length]));
      setQueueIndex(0);
      setRoundCorrect(0);
      setRoundMistakes([]);
      setRoundFinished(false);
      setCheckResult(null);
      setInputText('');
      setSelectedTiles([]);
    } else {
      setRoundSeed((s) => s + 1);
    }
  };

  // Global Enter key handler so pressing Enter advances even when focus is lost (e.g. disabled input or after clicking audio buttons)
  const enterActionRef = useRef<(e: KeyboardEvent) => void>();
  enterActionRef.current = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.isComposing || e.repeat) return;
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl?.tagName === 'SELECT') return;

    if (roundFinished) {
      e.preventDefault();
      handleRestartWithList(roundMistakes.length > 0 ? roundMistakes : undefined);
      return;
    }

    const submittedFinalNow = Boolean(checkResult && !checkResult.isAlternateRetry);
    if (submittedFinalNow) {
      e.preventDefault();
      handleNext();
      return;
    }

    if (activeEl?.tagName === 'BUTTON' || activeEl?.tagName === 'A') return;

    if (inputMode === 'tiles') {
      if (selectedTiles.length > 0) {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }

    if (activeEl !== inputRef.current) {
      e.preventDefault();
      if (inputText.trim().length > 0) {
        handleSubmit();
      } else {
        inputRef.current?.focus();
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => enterActionRef.current?.(e);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Used tile IDs set for tile builder
  const selectedTileIds = new Set(selectedTiles.map((t) => t.id));
  const draftChars = Array.from(currentAnswerDraft);

  // Round Completion Screen
  if (roundFinished) {
    const accuracy = queue.length > 0 ? Math.round((roundCorrect / queue.length) * 100) : 100;
    const grade = accuracy >= 95 ? 'S' : accuracy >= 80 ? 'A' : 'B';

    return (
      <div className="flex-1 overflow-y-auto game-scroll flex items-center justify-center p-2">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-washi-light border-4 border-aiiro rounded-3xl p-6 max-w-2xl w-full shadow-game-card space-y-5"
        >
          <div className="flex items-center justify-between border-b-2 border-dashed border-washi-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-kohaku border-2 border-aiiro flex items-center justify-center text-3xl">
                <Award className="w-8 h-8 text-aiiro" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-shuiro">🖋️ ことば・つづり屋</div>
                <h3 className="text-2xl font-black text-aiiro">活字検品 完了レポート</h3>
              </div>
            </div>

            <div className="hanko-stamp w-16 h-16 flex flex-col items-center justify-center font-black">
              <span className="text-[10px]">評価</span>
              <span className="text-2xl leading-none">{grade}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-washi border-2 border-washi-border rounded-2xl p-3">
              <div className="text-xs font-bold text-sumi-muted">検品単語数</div>
              <div className="text-2xl font-black text-aiiro">{queue.length} 語</div>
            </div>
            <div className="bg-washi border-2 border-washi-border rounded-2xl p-3">
              <div className="text-xs font-bold text-sumi-muted">一発合格</div>
              <div className="text-2xl font-black text-matcha-dark">{roundCorrect} 語</div>
            </div>
            <div className="bg-washi border-2 border-washi-border rounded-2xl p-3">
              <div className="text-xs font-bold text-sumi-muted">正解率</div>
              <div className="text-2xl font-black text-shuiro">{accuracy}%</div>
            </div>
          </div>

          {roundMistakes.length > 0 ? (
            <div className="bg-shuiro/10 border-2 border-shuiro rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-shuiro">
                📕 今回の要復習単語（{roundMistakes.length} 語）：
              </div>
              <div className="flex flex-wrap gap-2">
                {roundMistakes.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => speakJapanese(w.reading, 0.9)}
                    className="game-btn bg-washi-light border border-shuiro rounded-xl px-3 py-1.5 text-xs font-extrabold text-sumi flex items-center gap-1.5"
                  >
                    <span>{w.emoji}</span>
                    <span>{w.display}</span>
                    <span className="text-shuiro">({w.reading})</span>
                    <Volume2 className="w-3.5 h-3.5 text-aiiro" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-matcha/15 border-2 border-matcha rounded-2xl p-4 text-center font-black text-matcha-dark">
              🎉 全問一発合格！活字マスターの腕前です！
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {roundMistakes.length > 0 && (
              <button
                onClick={() => handleRestartWithList(roundMistakes)}
                className="game-btn bg-shuiro hover:bg-shuiro-light text-white font-black text-sm px-5 py-2.5 rounded-2xl border-2 border-aiiro-dark shadow-game-btn"
              >
                🔥 間違えた {roundMistakes.length} 語だけ再挑戦
              </button>
            )}
            <button
              onClick={() => handleRestartWithList()}
              className="game-btn flex items-center gap-1.5 bg-kohaku hover:bg-kohaku-light text-sumi font-black text-sm px-5 py-2.5 rounded-2xl border-2 border-aiiro-dark shadow-game-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>もう一巡テスト</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentWord) return null;

  const isSubmittedFinal = Boolean(checkResult && !checkResult.isAlternateRetry);
  const romajiHint =
    currentWord.scriptType === 'katakana'
      ? 'ローマ字で打つと自動カタカナ変換（- キーで「ー」入力）'
      : 'ローマ字で打つと自動ひらがな変換（例: shokudou → しょくどう）';

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden h-full">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-washi-light border-2 border-aiiro rounded-2xl p-2 shadow-sm shrink-0">
        {/* Left: Deck Selector + Scope Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={activeDeck.id}
            onChange={(e) => onChangeDeckId(e.target.value)}
            className="bg-aiiro text-kohaku-light font-black text-xs px-2.5 py-1.5 rounded-xl border-2 border-aiiro-dark focus:outline-none"
          >
            {WORD_DECKS.map((d) => (
              <option key={d.id} value={d.id}>
                📚 {d.title}
              </option>
            ))}
          </select>

          {[
            { id: 'all', label: `🌟 全部(${activeDeck.words.length})` },
            {
              id: 'hiragana',
              label: `あ 平仮名(${activeDeck.words.filter((w) => w.scriptType === 'hiragana').length})`,
            },
            {
              id: 'katakana',
              label: `ア 片仮名(${activeDeck.words.filter((w) => w.scriptType === 'katakana').length})`,
            },
            { id: 'review', label: `📕 弱点(${reviewWords.length})` },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                gameAudio.playClick();
                setScope(item.id as ScopeFilter);
              }}
              className={`game-btn px-2.5 py-1.5 rounded-xl font-extrabold text-xs border-2 ${
                scope === item.id
                  ? 'bg-shuiro text-white border-aiiro-dark shadow-game-btn'
                  : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right: Prompt Mode + Input Mode + Combo */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-washi p-0.5 rounded-xl border border-washi-border">
            {[
              { id: 'image', label: '🖼️ 看图' },
              { id: 'kanji', label: '🏷️ 漢字' },
              { id: 'meaning', label: '🇨🇳 意味' },
              { id: 'audio', label: '🎧 聴写' },
              { id: 'mixed', label: '🔀 混合' },
            ].map((pm) => (
              <button
                key={pm.id}
                onClick={() => {
                  gameAudio.playClick();
                  setPromptMode(pm.id as PromptMode);
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                  promptMode === pm.id ? 'bg-aiiro text-white' : 'text-sumi-muted hover:text-sumi'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              gameAudio.playClick();
              setInputMode((m) => (m === 'keyboard' ? 'tiles' : 'keyboard'));
            }}
            className="game-btn flex items-center gap-1 bg-kohaku hover:bg-kohaku-light text-sumi font-extrabold text-xs px-2.5 py-1.5 rounded-xl border-2 border-aiiro shadow-game-btn"
          >
            {inputMode === 'keyboard' ? (
              <>
                <Puzzle className="w-3.5 h-3.5" />
                <span>活字積木へ</span>
              </>
            ) : (
              <>
                <Keyboard className="w-3.5 h-3.5" />
                <span>キーボードへ</span>
              </>
            )}
          </button>

          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border-2 font-black text-xs ${
              combo >= 3
                ? 'bg-shuiro text-white border-aiiro-dark'
                : 'bg-washi text-sumi border-washi-border'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{combo}連</span>
          </div>
        </div>
      </div>

      {/* Main Arena Split Stage */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto game-scroll pr-1">
        {/* Left: Flashcard Prompt Stage */}
        <div className="lg:col-span-6 bg-washi-light border-4 border-aiiro rounded-3xl p-5 shadow-game-card flex flex-col justify-between gap-4">
          {/* Card Progress & Metadata Header */}
          <div className="flex items-center justify-between border-b-2 border-dashed border-washi-border pb-3">
            <div className="flex items-center gap-2">
              <span className="bg-aiiro text-kohaku-light text-xs font-black px-3 py-1 rounded-full">
                第 {queueIndex + 1} / {queue.length} 枚
              </span>
              <span
                className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                  currentWord.scriptType === 'katakana'
                    ? 'bg-kohaku/30 text-sumi border-kohaku-dark'
                    : 'bg-matcha/15 text-matcha-dark border-matcha'
                }`}
              >
                {currentWord.scriptType === 'katakana' ? 'ア カタカナ外来語' : 'あ ひらがな綴り'}
              </span>
              <span className="text-[11px] font-bold text-sumi-muted hidden sm:inline">
                {currentWord.categoryLabel}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => speakJapanese(currentWord.reading, 0.95)}
                className="game-btn flex items-center gap-1 bg-shuiro hover:bg-shuiro-light text-white font-extrabold text-xs px-3 py-1.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>発音</span>
              </button>
              <button
                onClick={() => speakJapanese(currentWord.reading, 0.65)}
                title="ゆっくり発音"
                className="game-btn bg-washi hover:bg-washi-dark text-sumi p-1.5 rounded-xl border-2 border-aiiro shadow-game-btn"
              >
                <Turtle className="w-4 h-4 text-matcha" />
              </button>
            </div>
          </div>

          {/* Center Prompt Display */}
          <motion.div
            key={`${currentWord.id}-${effectivePrompt}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center bg-washi border-4 border-aiiro rounded-3xl p-5 relative"
          >
            {effectivePrompt === 'audio' && !isSubmittedFinal ? (
              <>
                <div className="w-20 h-20 rounded-3xl bg-kohaku/25 border-4 border-aiiro flex items-center justify-center text-4xl mb-3">
                  🎧
                </div>
                <div className="text-lg font-black text-aiiro mb-1">
                  音声を聴いてスペルを綴ろう！
                </div>
                <p className="text-xs font-bold text-sumi-muted mb-3">
                  長音（う / ー）や濁音に注意して聴き取ろう
                </p>
                <button
                  type="button"
                  onClick={() => speakJapanese(currentWord.reading, 0.85)}
                  className="game-btn flex items-center gap-2 bg-aiiro text-kohaku-light font-black px-5 py-2.5 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-sm"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>もう一度聴く</span>
                </button>
              </>
            ) : effectivePrompt === 'image' && !isSubmittedFinal ? (
              <>
                <WordIllustration
                  src={currentWord.imageUrl}
                  alt={currentWord.meaning}
                  fallbackEmoji={currentWord.emoji}
                  size="lg"
                  className="mb-3"
                />
                <div className="text-xs font-extrabold text-matcha-dark bg-matcha/15 px-3 py-1 rounded-full border border-matcha">
                  🖼️ イラストを見て綴ろう（看图拼写 · ヒントで意味を表示）
                </div>
              </>
            ) : effectivePrompt === 'meaning' && !isSubmittedFinal ? (
              <>
                <WordIllustration
                  src={currentWord.imageUrl}
                  alt={currentWord.meaning}
                  fallbackEmoji={currentWord.emoji}
                  size="lg"
                  className="mb-3"
                />
                <div className="text-xs font-extrabold text-shuiro mb-1">
                  中国語の意味から日本語を思い出そう！
                </div>
                <div className="text-2xl sm:text-3xl font-black text-aiiro">
                  {currentWord.meaning}
                </div>
              </>
            ) : currentWord.scriptType === 'katakana' && !isSubmittedFinal ? (
              /* Spoiler-free card for katakana loanwords in kanji mode */
              <>
                <WordIllustration
                  src={currentWord.imageUrl}
                  alt={currentWord.meaning}
                  fallbackEmoji={currentWord.emoji}
                  size="lg"
                  className="mb-3"
                />
                <div className="text-xs font-extrabold text-kohaku-dark bg-kohaku/20 px-3 py-1 rounded-full border border-kohaku mb-2">
                  ア 外来語（カタカナで綴ろう · ネタバレ防止表示）
                </div>
                <div className="text-2xl sm:text-3xl font-black text-aiiro">
                  {currentWord.meaning}
                </div>
              </>
            ) : (
              <>
                <WordIllustration
                  src={currentWord.imageUrl}
                  alt={currentWord.meaning}
                  fallbackEmoji={currentWord.emoji}
                  size="md"
                  className="w-44 h-28 mb-2"
                />
                <div className="text-3xl sm:text-5xl font-black text-aiiro tracking-wide">
                  {currentWord.display}
                </div>
                <div className="mt-2 text-base sm:text-lg font-extrabold text-sumi-muted">
                  {currentWord.meaning}
                </div>
              </>
            )}

            {/* Collapsible Letterpress Character Slots (collapsed by default so word length isn't spoiled) */}
            {showLengthSlots || isSubmittedFinal ? (
              <div className="mt-5 flex flex-col items-center gap-2">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {Array.from(currentWord.reading).map((_, idx) => {
                    const filled = draftChars[idx];
                    return (
                      <div
                        key={idx}
                        className={`w-9 h-10 sm:w-10 sm:h-11 rounded-xl border-2 flex items-center justify-center font-black text-lg sm:text-xl transition-all ${
                          filled
                            ? 'bg-washi-light border-aiiro text-aiiro shadow-sm'
                            : 'bg-washi-dark/60 border-dashed border-washi-border text-sumi-muted/40'
                        }`}
                      >
                        {filled || '・'}
                      </div>
                    );
                  })}
                </div>
                {!isSubmittedFinal && (
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClick();
                      setShowLengthSlots(false);
                    }}
                    className="text-[11px] font-bold text-sumi-muted hover:text-aiiro underline"
                  >
                    ▲ 文字数マスを折りたたむ
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setShowLengthSlots(true);
                }}
                className="game-btn mt-5 bg-washi-dark/75 hover:bg-kohaku/25 text-sumi-muted hover:text-aiiro border-2 border-dashed border-washi-border rounded-xl px-3.5 py-1.5 text-xs font-extrabold"
              >
                🔢 文字数マスを表示（折りたたみ中）
              </button>
            )}
          </motion.div>

          {/* Bottom Hint Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                setShowHint((prev) => !prev);
              }}
              className="game-btn flex items-center gap-1 text-aiiro hover:text-shuiro font-extrabold"
            >
              <HelpCircle className="w-4 h-4" />
              <span>
                {showHint
                  ? `💡 ヒント：最初の文字「${Array.from(currentWord.reading)[0]}」／ ${currentWord.meaning}`
                  : '💡 ヒントを見る（頭文字・意味）'}
              </span>
            </button>

            {!isSubmittedFinal && (
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setShowLengthSlots((prev) => !prev);
                }}
                className="game-btn text-sumi-muted hover:text-aiiro font-extrabold"
              >
                {showLengthSlots ? '🔢 字数ヒントを隠す' : '🔢 字数ヒント'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Dual Input Console + Character-by-Character Diff Diagnostics */}
        <div className="lg:col-span-6 bg-washi-light border-4 border-aiiro rounded-3xl p-5 shadow-game-card flex flex-col justify-between gap-4">
          {/* Input Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-aiiro">
                {inputMode === 'keyboard' ? '⌨️ 活字タイプ入力：' : '🧩 活字ブロック拼字：'}
              </span>
              <span className="text-[11px] font-bold text-matcha-dark bg-matcha/15 px-2.5 py-0.5 rounded-md">
                {inputMode === 'keyboard' ? romajiHint : '下の仮名タイルをクリックして並べよう'}
              </span>
            </div>

            {inputMode === 'keyboard' ? (
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      disabled={isSubmittedFinal}
                      onChange={handleLiveKeyboardChange}
                      placeholder={
                        currentWord.scriptType === 'katakana'
                          ? '例: erebe-ta- → エレベーター'
                          : '例: shokudou → しょくどう'
                      }
                      className="w-full bg-washi border-4 border-aiiro focus:border-shuiro rounded-2xl px-4 py-3 text-xl sm:text-2xl font-black text-sumi placeholder:text-sumi-muted/40 focus:outline-none"
                    />
                    {inputText && !isSubmittedFinal && (
                      <span className="hidden sm:inline absolute right-3 bottom-1.5 text-[11px] font-mono font-bold text-sumi-muted">
                        {wanakana.toRomaji(inputText)}
                      </span>
                    )}
                  </div>

                  {/* Quick Long-Vowel Bar Button for Katakana Loanwords */}
                  {currentWord.scriptType === 'katakana' && !isSubmittedFinal && (
                    <button
                      type="button"
                      onClick={handleInsertLongVowel}
                      title="長音記号「ー」を挿入"
                      className="game-btn bg-kohaku hover:bg-kohaku-light text-sumi font-black px-3.5 py-3 rounded-2xl border-4 border-aiiro shadow-game-btn text-lg shrink-0"
                    >
                      ー
                    </button>
                  )}
                </div>

                {!isSubmittedFinal ? (
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="game-btn w-full flex items-center justify-center gap-2 bg-shuiro hover:bg-shuiro-light disabled:opacity-50 text-white font-black py-3 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-base"
                  >
                    <Send className="w-4 h-4" />
                    <span>スペルを検品する (Enter)</span>
                  </button>
                ) : (
                  <button
                    ref={nextBtnRef}
                    type="button"
                    onClick={handleNext}
                    className="game-btn w-full flex items-center justify-center gap-2 bg-matcha hover:bg-matcha-light text-white font-black py-3 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-base"
                  >
                    <span>
                      {queueIndex + 1 >= queue.length
                        ? '検品レポートを見る (Enter)'
                        : '次の単語へ進む (Enter)'}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </form>
            ) : (
              /* Tile Builder Mode */
              <div className="space-y-3">
                {/* Placed Tiles Bar */}
                <div className="min-h-[58px] bg-washi border-4 border-aiiro rounded-2xl p-2 flex flex-wrap items-center gap-1.5">
                  {selectedTiles.length === 0 ? (
                    <span className="text-xs font-bold text-sumi-muted px-2">
                      下の活字ブロックを順番にタップして単語を組み立てよう…
                    </span>
                  ) : (
                    selectedTiles.map((tile, idx) => (
                      <button
                        key={`${tile.id}-placed-${idx}`}
                        type="button"
                        disabled={isSubmittedFinal}
                        onClick={() => handleTileRemoveAt(idx)}
                        className="game-btn bg-washi-light border-2 border-aiiro text-aiiro font-black text-lg px-2.5 py-1 rounded-xl shadow-sm"
                      >
                        {tile.char}
                      </button>
                    ))
                  )}
                </div>

                {/* Available Letterpress Tile Rack */}
                {!isSubmittedFinal && (
                  <>
                    <div className="flex flex-wrap gap-2 bg-aiiro/5 p-3 rounded-2xl border-2 border-washi-border">
                      {tilePool.map((tile) => {
                        const used = selectedTileIds.has(tile.id);
                        return (
                          <button
                            key={tile.id}
                            type="button"
                            disabled={used}
                            onClick={() => handleTilePick(tile)}
                            className={`game-btn w-10 h-10 rounded-xl border-2 font-black text-lg flex items-center justify-center ${
                              used
                                ? 'bg-washi-dark/50 border-washi-border text-sumi-muted/30 cursor-not-allowed'
                                : 'bg-washi-light hover:bg-kohaku-light border-aiiro text-sumi shadow-game-btn'
                            }`}
                          >
                            {tile.char}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          gameAudio.playClick();
                          setSelectedTiles((prev) => prev.slice(0, -1));
                        }}
                        disabled={selectedTiles.length === 0}
                        className="game-btn flex items-center gap-1 bg-washi hover:bg-washi-dark disabled:opacity-40 text-sumi font-extrabold text-xs px-3 py-3 rounded-2xl border-2 border-aiiro shadow-game-btn"
                      >
                        <Delete className="w-4 h-4" />
                        <span>1文字戻す</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmit()}
                        disabled={selectedTiles.length === 0}
                        className="game-btn flex-1 flex items-center justify-center gap-2 bg-shuiro hover:bg-shuiro-light disabled:opacity-50 text-white font-black py-3 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-sm sm:text-base"
                      >
                        <Send className="w-4 h-4" />
                        <span>この並びで検品する</span>
                      </button>
                    </div>
                  </>
                )}

                {isSubmittedFinal && (
                  <button
                    ref={nextBtnRef}
                    type="button"
                    onClick={handleNext}
                    className="game-btn w-full flex items-center justify-center gap-2 bg-matcha hover:bg-matcha-light text-white font-black py-3 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-base"
                  >
                    <span>
                      {queueIndex + 1 >= queue.length ? '検品レポートを見る' : '次の単語へ進む'}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Spelling Check Diagnostic Feedback Panel */}
          <div className="flex-1 flex flex-col justify-end">
            <AnimatePresence mode="wait">
              {checkResult ? (
                checkResult.isAlternateRetry ? (
                  <motion.div
                    key="retry"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-3xl border-4 border-kohaku bg-kohaku/20 p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-kohaku-dark font-black text-base">
                      <AlertTriangle className="w-5 h-5" />
                      <span>{checkResult.diagnostics[0]?.title}</span>
                    </div>
                    <p className="text-sm font-extrabold text-sumi leading-relaxed">
                      {checkResult.diagnostics[0]?.detail}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-3xl border-4 p-4 space-y-3 ${
                      checkResult.isCorrect
                        ? 'bg-matcha/15 border-matcha'
                        : 'bg-shuiro/12 border-shuiro'
                    }`}
                  >
                    {/* Header Stamp & Rewards */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {checkResult.isCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-matcha shrink-0" />
                        ) : (
                          <XCircle className="w-6 h-6 text-shuiro shrink-0" />
                        )}
                        <span className="text-lg font-black text-sumi">
                          {checkResult.isCorrect ? '✨ 検品合格！大正解' : '🔍 スペルミス発見！'}
                        </span>
                      </div>

                      {checkResult.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black bg-kohaku text-sumi px-2.5 py-1 rounded-full border border-aiiro">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            +{25 + Math.min(combo, 10) * 5} EXP / +{15 + Math.min(combo, 10) * 3}G
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs font-black bg-shuiro text-white px-2.5 py-1 rounded-full">
                          弱点帳に記録
                        </span>
                      )}
                    </div>

                    {/* Per-Character Visual Diff Cells */}
                    {!checkResult.isCorrect && (
                      <div className="bg-washi-light border-2 border-aiiro rounded-2xl p-3 space-y-2">
                        <div className="text-[11px] font-extrabold text-sumi-muted flex items-center justify-between">
                          <span>1文字ずつの照合チェック（緑=正解 / 赤=誤字 / 黄枠=抜け / 灰=余分）：</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {checkResult.diffCells.map((cell, idx) => {
                            if (cell.status === 'match') {
                              return (
                                <div
                                  key={idx}
                                  className="px-2.5 py-1 rounded-xl bg-matcha/20 border-2 border-matcha text-matcha-dark font-black text-lg"
                                >
                                  {cell.expected}
                                </div>
                              );
                            }
                            if (cell.status === 'wrong') {
                              return (
                                <div
                                  key={idx}
                                  className="px-2.5 py-1 rounded-xl bg-shuiro/20 border-2 border-shuiro text-center"
                                >
                                  <span className="text-xs line-through text-shuiro font-bold mr-1">
                                    {cell.actual}
                                  </span>
                                  <span className="text-lg font-black text-aiiro">
                                    →{cell.expected}
                                  </span>
                                </div>
                              );
                            }
                            if (cell.status === 'missing') {
                              return (
                                <div
                                  key={idx}
                                  className="px-2.5 py-1 rounded-xl bg-kohaku/25 border-2 border-dashed border-kohaku-dark text-sumi font-black text-lg"
                                  title="抜けている文字"
                                >
                                  +{cell.expected}
                                </div>
                              );
                            }
                            return (
                              <div
                                key={idx}
                                className="px-2.5 py-1 rounded-xl bg-washi-dark border-2 border-washi-border text-sumi-muted line-through font-black text-lg"
                                title="余分な文字"
                              >
                                {cell.actual}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Diagnostic Tips */}
                    {!checkResult.isCorrect && checkResult.diagnostics.length > 0 && (
                      <div className="space-y-1.5">
                        {checkResult.diagnostics.map((diag, idx) => (
                          <div
                            key={idx}
                            className="bg-washi-light border-2 border-kohaku rounded-xl px-3 py-2 text-xs font-extrabold text-sumi"
                          >
                            <span className="text-shuiro mr-1">⚠️ {diag.title}：</span>
                            <span>{diag.detail}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Standard Answer + Example Sentence */}
                    <div className="bg-washi-light border-2 border-washi-border rounded-2xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-aiiro">
                          {currentWord.display} ＝{' '}
                          <span className="text-shuiro text-lg">{currentWord.reading}</span>
                          <span className="text-xs font-normal text-sumi-muted ml-2">
                            ({currentWord.meaning})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakJapanese(currentWord.exampleJp, 0.95)}
                          className="game-btn flex items-center gap-1 bg-aiiro text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>例文</span>
                        </button>
                      </div>
                      <div className="text-xs font-bold text-sumi">
                        📖 {currentWord.exampleJp}（{currentWord.exampleZh}）
                      </div>
                      <div className="text-xs font-extrabold text-matcha-dark">
                        💡 {currentWord.spellingTip}
                      </div>
                    </div>
                  </motion.div>
                )
              ) : (
                <div className="bg-washi border-2 border-dashed border-washi-border rounded-3xl p-4 text-xs font-bold text-sumi-muted space-y-1.5">
                  <div className="font-extrabold text-aiiro">🖋️ スペルチェック道場のヒント：</div>
                  <div>・キーボードにローマ字を打つだけで、平仮名/カタカナに自動変換されます。</div>
                  <div>・外来語の伸ばし棒「ー」は、キーボードの「-」キーまたは右側の「ー」ボタンで入力できます。</div>
                  <div>・間違えても大丈夫！1文字単位のDiff診断で「長音・濁音・拗音」のどこでミスしたかすぐ分かります。</div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
