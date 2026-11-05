import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import * as wanakana from 'wanakana';
import {
  Mic,
  MicOff,
  Volume2,
  Send,
  Sparkles,
  Flame,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Trash2,
  CheckCircle2,
  XCircle,
  Shuffle,
} from 'lucide-react';
import {
  CURATED_SCENARIO_QUESTIONS,
  QuizCategory,
  ScenarioQuestion,
  generateDynamicScenarioQuestion,
} from '../../data/scenarioQuestions';
import { SOUND_CHANGE_META } from '../../data/japaneseNumbers';
import { gameAudio, speakJapanese } from '../../engine/audio';
import {
  JapaneseSpeechRecognizer,
  evaluateJapaneseAnswer,
  isSpeechRecognitionSupported,
} from '../../engine/speechRecognition';
import { saveStore, usePlayerSave } from '../../engine/saveStore';
import { CharacterMood } from '../../components/ShopkeeperAvatar';

interface ScenarioQuizDojoProps {
  onMoodChange: (mood: CharacterMood, speech?: string) => void;
  forceMistakeMode?: boolean;
  onClearForceMistakeMode?: () => void;
}

type QuizFilterMode = 'all' | QuizCategory | 'endless' | 'mistakes';

export const ScenarioQuizDojo: React.FC<ScenarioQuizDojoProps> = ({
  onMoodChange,
  forceMistakeMode,
  onClearForceMistakeMode,
}) => {
  const save = usePlayerSave();
  const [filterMode, setFilterMode] = useState<QuizFilterMode>('all');
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<ScenarioQuestion>(CURATED_SCENARIO_QUESTIONS[0]);

  // Input & Evaluation States
  const [inputText, setInputText] = useState<string>('');
  const [romajiPreview, setRomajiPreview] = useState<string>('');
  const [submittedResult, setSubmittedResult] = useState<{
    isCorrect: boolean;
    userHira: string;
    gainedExp?: number;
    gainedCoins?: number;
    wasVoice?: boolean;
  } | null>(null);

  const [combo, setCombo] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showMistakeDrawer, setShowMistakeDrawer] = useState<boolean>(false);

  // Voice Recognition States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceStatusMsg, setVoiceStatusMsg] = useState<string | null>(null);
  const recognizerRef = useRef<JapaneseSpeechRecognizer | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Switch to mistake mode if triggered from top HUD
  useEffect(() => {
    if (forceMistakeMode) {
      if (save.mistakes.length > 0) {
        setFilterMode('mistakes');
        setQuestionIndex(0);
      } else {
        setShowMistakeDrawer(true);
      }
      onClearForceMistakeMode?.();
    }
  }, [forceMistakeMode, save.mistakes.length, onClearForceMistakeMode]);

  // Compute Filtered Question Pool
  const getFilteredPool = (mode: QuizFilterMode): ScenarioQuestion[] => {
    if (mode === 'mistakes') {
      if (save.mistakes.length === 0) return CURATED_SCENARIO_QUESTIONS;
      return save.mistakes.map((m) => {
        const found = CURATED_SCENARIO_QUESTIONS.find((q) => q.id === m.id);
        if (found) return found;
        return {
          id: m.id,
          category: m.category,
          sceneName: '📕 弱点ノート復習道場',
          customerName: '復習のお客さん',
          customerEmoji: '📝',
          dialogueBefore: m.contextSentence.split(`【 ${m.targetDisplay} 】`)[0] || 'これの読み方は ',
          targetDisplay: m.targetDisplay,
          dialogueAfter: m.contextSentence.split(`【 ${m.targetDisplay} 】`)[1] || ' ですね！',
          fullSentenceTts: m.correctReadings[0],
          chineseTranslation: '（错题本复习特训题）',
          acceptedReadings: m.correctReadings,
          voiceDisplayVariants: [m.targetDisplay],
          changeType: 'special',
          explanation: m.explanation,
        };
      });
    }
    if (mode === 'all') return CURATED_SCENARIO_QUESTIONS;
    if (mode === 'endless') return [generateDynamicScenarioQuestion(questionIndex)];
    return CURATED_SCENARIO_QUESTIONS.filter((q) => q.category === mode);
  };

  // Load current question whenever filterMode or questionIndex changes
  useEffect(() => {
    if (filterMode === 'endless') {
      setCurrentQuestion(generateDynamicScenarioQuestion(questionIndex));
    } else {
      const pool = getFilteredPool(filterMode);
      const safeIdx = questionIndex % Math.max(1, pool.length);
      setCurrentQuestion(pool[safeIdx]);
    }
    setInputText('');
    setRomajiPreview('');
    setSubmittedResult(null);
    setShowHint(false);
    setVoiceStatusMsg(null);
    setTimeout(() => inputRef.current?.focus(), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, questionIndex]);

  // Handle Romaji-to-Hiragana live conversion in input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // wanakana with IMEMode converts completed romaji syllables to hiragana while preserving trailing consonants like 'n' or 'ky'
    const converted = wanakana.toHiragana(raw, { IMEMode: true });
    setInputText(converted);
    setRomajiPreview(wanakana.toRomaji(converted));
  };

  // Evaluate Answer (from Keyboard or Voice)
  const submitAnswer = (rawAnswer: string, isVoice: boolean = false) => {
    if (submittedResult) return;
    // Convert any trailing romaji like single 'n' into 'ん' on final submit
    const finalInput = wanakana.toHiragana(rawAnswer.trim());
    if (!finalInput) return;

    const evalRes = evaluateJapaneseAnswer(
      finalInput,
      currentQuestion.acceptedReadings,
      currentQuestion.voiceDisplayVariants,
      isVoice
    );

    if (evalRes.isCorrect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      gameAudio.playSuccess(nextCombo);
      speakJapanese(currentQuestion.acceptedReadings[0], 0.95);

      const reward = saveStore.recordCorrectAnswer(
        nextCombo,
        filterMode === 'mistakes' ? currentQuestion.id : undefined
      );

      setSubmittedResult({
        isCorrect: true,
        userHira: evalRes.normalizedUserHira,
        gainedExp: reward.gainedExp,
        gainedCoins: reward.gainedCoins,
        wasVoice: isVoice,
      });

      if (nextCombo >= 3) {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
        });
      }

      onMoodChange(
        nextCombo >= 3 ? 'excited' : 'happy',
        `大正解！！「${currentQuestion.targetDisplay}」は『${currentQuestion.acceptedReadings[0]}』！${nextCombo}連続コンボ中♪`
      );
    } else {
      setCombo(0);
      gameAudio.playError();
      speakJapanese(currentQuestion.acceptedReadings[0], 0.9);

      saveStore.recordWrongAnswer({
        id: currentQuestion.id,
        targetDisplay: currentQuestion.targetDisplay,
        contextSentence: `${currentQuestion.dialogueBefore}【 ${currentQuestion.targetDisplay} 】${currentQuestion.dialogueAfter}`,
        correctReadings: currentQuestion.acceptedReadings,
        wrongInput: evalRes.normalizedUserHira || rawAnswer,
        category: currentQuestion.category,
        explanation: currentQuestion.explanation,
      });

      setSubmittedResult({
        isCorrect: false,
        userHira: evalRes.normalizedUserHira || rawAnswer,
        wasVoice: isVoice,
      });

      onMoodChange(
        'oops',
        `惜しいっ！「${currentQuestion.targetDisplay}」の正しい読みは『${currentQuestion.acceptedReadings[0]}』だよ。弱点ノートにメモしておいたよ！`
      );
    }
  };

  // Start / Stop Microphone Voice Input
  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      setVoiceStatusMsg('お使いのブラウザは音声認識（Web Speech API）に対応していません。Chrome / Edge をお試しください。');
      return;
    }

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      return;
    }

    gameAudio.playClick();
    setVoiceStatusMsg('🎙️ 日本語で「' + currentQuestion.targetDisplay + '」の読みを発音してください...');

    const recognizer = new JapaneseSpeechRecognizer({
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript, isFinal) => {
        setInputText(transcript);
        setVoiceStatusMsg(`認識中: 「${transcript}」`);
        if (isFinal) {
          setIsListening(false);
          submitAnswer(transcript, true);
        }
      },
      onError: (errMsg) => {
        setIsListening(false);
        setVoiceStatusMsg(errMsg);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    recognizerRef.current = recognizer;
    recognizer.start();
  };

  const handleNextQuestion = () => {
    gameAudio.playPageFlip();
    setQuestionIndex((prev) => prev + 1);
  };

  const primaryReading = currentQuestion.acceptedReadings[0] || '';
  const hintString =
    primaryReading.length > 1
      ? `頭文字は「${primaryReading[0]}」（全 ${primaryReading.length} 文字）`
      : `「${primaryReading}」`;

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden h-full relative">
      {/* Top Dojo Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-washi-light border-2 border-aiiro rounded-2xl p-2 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: '🌟 総合接客' },
            { id: 'counter', label: '🍡 助数詞(量詞)' },
            { id: 'number_price', label: '💰 価格・数字' },
            { id: 'date_time', label: '📅 日付・時間' },
            { id: 'endless', label: '🎲 無限ランダム注文' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                gameAudio.playClick();
                setFilterMode(tab.id as QuizFilterMode);
                setQuestionIndex(0);
              }}
              className={`game-btn px-3 py-1.5 rounded-xl font-extrabold text-xs border-2 ${
                filterMode === tab.id
                  ? 'bg-shuiro text-white border-aiiro-dark shadow-game-btn'
                  : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Mistake Review Mode Tab */}
          <button
            onClick={() => {
              gameAudio.playClick();
              if (save.mistakes.length > 0) {
                setFilterMode('mistakes');
                setQuestionIndex(0);
              } else {
                setShowMistakeDrawer(true);
              }
            }}
            className={`game-btn flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold text-xs border-2 ${
              filterMode === 'mistakes'
                ? 'bg-aiiro text-kohaku-light border-aiiro-dark shadow-game-btn'
                : 'bg-kohaku/20 text-shuiro-dark border-kohaku'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📕 弱点特訓 ({save.mistakes.length})</span>
          </button>
        </div>

        {/* Right: Active Combo Indicator & Mistake Drawer Button */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 font-black text-xs transition-all ${
              combo >= 3
                ? 'bg-shuiro text-white border-aiiro-dark animate-bounce'
                : combo > 0
                ? 'bg-kohaku text-sumi border-aiiro-dark'
                : 'bg-washi text-sumi-muted border-washi-border'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>{combo} COMBO!</span>
          </div>

          <button
            onClick={() => {
              gameAudio.playClick();
              setShowMistakeDrawer(true);
            }}
            className="game-btn text-xs font-extrabold bg-washi hover:bg-washi-dark text-sumi px-2.5 py-1.5 rounded-xl border border-aiiro"
          >
            📋 弱点一覧を見る
          </button>
        </div>
      </div>

      {/* Main Battle Stage Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto game-scroll pr-1">
        {/* Left/Center: Customer Dialogue Encounter Stage */}
        <div className="lg:col-span-7 bg-washi-light border-4 border-aiiro rounded-3xl p-5 shadow-game-card flex flex-col justify-between gap-4">
          {/* Scene Header Banner */}
          <div className="flex items-center justify-between border-b-2 border-dashed border-washi-border pb-3">
            <div className="flex items-center gap-2">
              <span className="bg-aiiro text-kohaku-light text-xs font-extrabold px-3 py-1 rounded-full">
                {currentQuestion.sceneName}
              </span>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  SOUND_CHANGE_META[currentQuestion.changeType].badgeClass
                }`}
              >
                {SOUND_CHANGE_META[currentQuestion.changeType].shortLabel}
              </span>
            </div>

            <button
              onClick={() => {
                gameAudio.playClick();
                speakJapanese(currentQuestion.fullSentenceTts, 0.95);
              }}
              className="game-btn flex items-center gap-1 bg-washi hover:bg-washi-dark text-sumi font-extrabold text-xs px-3 py-1.5 rounded-xl border-2 border-aiiro shadow-game-btn"
            >
              <Volume2 className="w-3.5 h-3.5 text-shuiro" />
              <span>セリフ全文を聴く</span>
            </button>
          </div>

          {/* Customer Portrait + Visual Novel Speech Bubble */}
          <div className="my-auto flex flex-col items-center text-center px-2">
            {/* Customer Avatar */}
            <motion.div
              key={currentQuestion.id}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center mb-3"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-b from-washi to-washi-dark border-4 border-aiiro shadow-game-btn flex items-center justify-center text-5xl">
                {currentQuestion.customerEmoji}
              </div>
              <span className="mt-1.5 bg-aiiro text-washi-light text-xs font-extrabold px-3 py-0.5 rounded-full">
                {currentQuestion.customerName}
              </span>
            </motion.div>

            {/* Speech Dialogue Box */}
            <div className="w-full bg-washi border-4 border-aiiro rounded-3xl p-5 shadow-inner relative">
              <p className="text-lg sm:text-2xl font-black text-sumi leading-relaxed">
                「{currentQuestion.dialogueBefore}
                <span className="inline-flex items-center mx-1.5 px-3.5 py-1 rounded-2xl bg-shuiro text-white border-2 border-aiiro-dark shadow-sm text-xl sm:text-2xl">
                  {currentQuestion.targetDisplay}
                </span>
                {currentQuestion.dialogueAfter}」
              </p>

              <p className="text-xs sm:text-sm font-bold text-sumi-muted mt-3">
                💬 {currentQuestion.chineseTranslation}
              </p>
            </div>
          </div>

          {/* Bottom Helper Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-dashed border-washi-border text-xs">
            <button
              onClick={() => {
                gameAudio.playClick();
                setShowHint(true);
              }}
              className="game-btn flex items-center gap-1 text-aiiro hover:text-shuiro font-extrabold"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{showHint ? `💡 ヒント：${hintString}` : '💡 ヒントを見る（頭文字と文字数）'}</span>
            </button>

            <button
              onClick={handleNextQuestion}
              className="game-btn flex items-center gap-1 text-sumi-muted hover:text-sumi font-extrabold"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>別の問題にスキップ</span>
            </button>
          </div>
        </div>

        {/* Right: Player Answer Console & Judgment Result Card */}
        <div className="lg:col-span-5 bg-washi-light border-4 border-aiiro rounded-3xl p-5 shadow-game-card flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-aiiro">
                🎯 『{currentQuestion.targetDisplay}』のひらがな読みを入力または発音：
              </span>
              <span className="text-[11px] font-bold text-matcha-dark bg-matcha/15 px-2 py-0.5 rounded-md">
                ローマ字自動変換 ON
              </span>
            </div>

            {/* Smart Romaji -> Hiragana Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (submittedResult) {
                  handleNextQuestion();
                } else {
                  submitAnswer(inputText, false);
                }
              }}
              className="space-y-2.5"
            >
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  disabled={!!submittedResult}
                  onChange={handleInputChange}
                  placeholder="例: sanbai → さんばい"
                  className="w-full bg-washi border-4 border-aiiro focus:border-shuiro rounded-2xl px-4 py-3.5 text-xl sm:text-2xl font-black text-sumi placeholder:text-sumi-muted/40 focus:outline-none"
                />
                {romajiPreview && !submittedResult && (
                  <span className="absolute right-3 bottom-2 text-[11px] font-mono font-bold text-sumi-muted">
                    {romajiPreview}
                  </span>
                )}
              </div>

              {/* Action Buttons Row: Submit Text OR Speak via Microphone */}
              {!submittedResult ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="game-btn flex items-center justify-center gap-1.5 bg-shuiro hover:bg-shuiro-light disabled:opacity-50 text-white font-black py-3 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-sm sm:text-base"
                  >
                    <Send className="w-4 h-4" />
                    <span>回答する (Enter)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`game-btn flex items-center justify-center gap-1.5 font-black py-3 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-sm sm:text-base ${
                      isListening
                        ? 'bg-shuiro-dark text-white animate-pulse'
                        : 'bg-kohaku hover:bg-kohaku-light text-sumi'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span>聴き取り中...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>🎙️ 声で接客</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="game-btn w-full flex items-center justify-center gap-2 bg-matcha hover:bg-matcha-light text-white font-black py-3.5 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-base"
                >
                  <span>次のお客さんへ進む (Enter)</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </form>

            {voiceStatusMsg && (
              <div className="mt-2 text-xs font-bold text-aiiro bg-kohaku/20 border border-kohaku rounded-xl px-3 py-1.5">
                {voiceStatusMsg}
              </div>
            )}
          </div>

          {/* Judgment Result & Phonetic Explanation Panel */}
          <div className="flex-1 flex flex-col justify-end">
            <AnimatePresence mode="wait">
              {submittedResult ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-3xl border-4 p-4 ${
                    submittedResult.isCorrect
                      ? 'bg-matcha/15 border-matcha text-sumi'
                      : 'bg-shuiro/15 border-shuiro text-sumi'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {submittedResult.isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-matcha shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-shuiro shrink-0" />
                      )}
                      <span className="text-lg font-black">
                        {submittedResult.isCorrect ? '✨ お見事！大正解！' : '💦 惜しい！弱点ノートに記録'}
                      </span>
                    </div>

                    {submittedResult.isCorrect && (
                      <div className="flex items-center gap-1.5 text-xs font-black bg-kohaku text-sumi px-2.5 py-1 rounded-full border border-aiiro">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+{submittedResult.gainedExp} EXP / +{submittedResult.gainedCoins}G</span>
                      </div>
                    )}
                  </div>

                  {/* Correct Reading Display */}
                  <div className="bg-washi-light border-2 border-aiiro rounded-2xl p-3 mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-sumi-muted">
                        正解の読み（{currentQuestion.targetDisplay}）：
                      </div>
                      <div className="text-2xl font-black text-shuiro">
                        {currentQuestion.acceptedReadings.join(' ／ ')}
                      </div>
                      <div className="text-xs font-mono font-bold text-sumi-muted">
                        {wanakana.toRomaji(currentQuestion.acceptedReadings[0])}
                      </div>
                    </div>

                    <button
                      onClick={() => speakJapanese(currentQuestion.acceptedReadings[0], 0.9)}
                      className="game-btn bg-aiiro text-white p-2.5 rounded-xl border-2 border-aiiro-dark"
                      title="正解の発音を聴く"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Rule Explanation */}
                  <p className="text-xs font-extrabold text-sumi leading-relaxed">
                    💡 {currentQuestion.explanation}
                  </p>
                </motion.div>
              ) : (
                <div className="bg-washi border-2 border-dashed border-washi-border rounded-3xl p-4 text-xs font-bold text-sumi-muted space-y-1.5">
                  <div className="font-extrabold text-aiiro">🎮 接客道場の操作ガイド：</div>
                  <div>・キーボードで直接ローマ字（例: <code className="bg-washi-dark px-1.5 py-0.5 rounded text-sumi">sanbai</code>）を打つと自動で「さんばい」に変換されます。</div>
                  <div>・マイクボタン「🎙️ 声で接客」を押して日本語で発音しても判定できます！</div>
                  <div>・間違えた問題は自動的に「📕 弱点ノート」に保存され、いつでも特訓できます。</div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Collapsible Mistake Notebook Modal (弱点ノート一覧) */}
      <AnimatePresence>
        {showMistakeDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-aiiro-dark/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="bg-washi-light border-4 border-aiiro rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="bg-shuiro text-white px-5 py-3.5 border-b-4 border-aiiro flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <h3 className="text-lg font-black">📕 弱点ノート（错题手账 · 共 {save.mistakes.length} 件）</h3>
                </div>
                <button
                  onClick={() => setShowMistakeDrawer(false)}
                  className="game-btn bg-washi-light text-sumi font-extrabold text-xs px-3 py-1.5 rounded-xl border-2 border-aiiro-dark"
                >
                  閉じる ✕
                </button>
              </div>

              <div className="p-4 overflow-y-auto game-scroll flex-1 space-y-2.5">
                {save.mistakes.length === 0 ? (
                  <div className="text-center py-12 text-sumi-muted font-bold">
                    <div className="text-4xl mb-2">🎉</div>
                    <div>現在、弱点ノートに記録された間違いはありません！パーフェクトです！</div>
                  </div>
                ) : (
                  save.mistakes.map((m) => (
                    <div
                      key={m.id}
                      className="bg-washi border-2 border-washi-border rounded-2xl p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-shuiro text-white text-xs font-black px-2.5 py-0.5 rounded-lg">
                            {m.targetDisplay}
                          </span>
                          <span className="text-base font-black text-aiiro">
                            正解：{m.correctReadings.join(' / ')}
                          </span>
                          <span className="text-xs font-bold text-sumi-muted">
                            （あなたの回答: {m.wrongInput}）
                          </span>
                        </div>
                        <div className="text-xs font-bold text-sumi">{m.explanation}</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => speakJapanese(m.correctReadings[0], 0.9)}
                          className="game-btn bg-kohaku text-sumi p-2 rounded-xl border border-aiiro"
                          title="発音を聴く"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => saveStore.removeMistake(m.id)}
                          className="game-btn bg-washi-dark hover:bg-shuiro hover:text-white text-sumi-muted p-2 rounded-xl border border-washi-border"
                          title="克服済みとして削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {save.mistakes.length > 0 && (
                <div className="p-3 bg-washi border-t-2 border-washi-border flex justify-end">
                  <button
                    onClick={() => {
                      setShowMistakeDrawer(false);
                      setFilterMode('mistakes');
                      setQuestionIndex(0);
                    }}
                    className="game-btn bg-shuiro text-white font-black text-sm px-5 py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn"
                  >
                    🔥 弱点ノート特訓モードを開始する！
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

