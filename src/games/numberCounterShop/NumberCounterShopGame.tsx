import React, { useEffect, useState } from 'react';
import { Calculator, MessageSquareHeart, ScrollText } from 'lucide-react';
import { CharacterMood, ShopkeeperAvatar } from '../../components/ShopkeeperAvatar';
import { gameAudio } from '../../engine/audio';
import { QuickLookupGadget } from './QuickLookupGadget';
import { ScenarioQuizDojo } from './ScenarioQuizDojo';
import { KnowledgeScrollTable } from './KnowledgeScrollTable';

export type CounterShopStation = 'lookup' | 'quiz' | 'scroll';

interface NumberCounterShopGameProps {
  initialStation?: CounterShopStation;
  forceMistakeQuiz?: boolean;
  onClearForceMistakeQuiz?: () => void;
}

export const NumberCounterShopGame: React.FC<NumberCounterShopGameProps> = ({
  initialStation = 'lookup',
  forceMistakeQuiz,
  onClearForceMistakeQuiz,
}) => {
  const [station, setStation] = useState<CounterShopStation>(initialStation);
  const [mood, setMood] = useState<CharacterMood>('happy');
  const [speech, setSpeech] = useState<string>(
    'いらっしゃいませ！「かず・カウンター屋」へようこそ！下の3つのコーナーから修行メニューを選んでね♪'
  );

  useEffect(() => {
    setStation(initialStation);
  }, [initialStation]);

  useEffect(() => {
    if (forceMistakeQuiz) {
      setStation('quiz');
    }
  }, [forceMistakeQuiz]);

  const handleMoodChange = (nextMood: CharacterMood, nextSpeech?: string) => {
    setMood(nextMood);
    if (nextSpeech) {
      setSpeech(nextSpeech);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col px-3 sm:px-6 py-3 max-w-7xl mx-auto w-full gap-3 overflow-hidden">
      {/* Top Shop Counter Header: Character + 3 Game Station Switcher */}
      <div className="bg-washi-light border-4 border-aiiro rounded-3xl px-4 py-2.5 shadow-game-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shrink-0">
        <ShopkeeperAvatar mood={mood} size="sm" speechText={speech} />

        {/* 3 Core Game Stations Switcher */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end shrink-0">
          <button
            onClick={() => {
              gameAudio.playClick();
              setStation('lookup');
              handleMoodChange(
                'happy',
                '『魔法のレジ・日めくり機』だよ！気になる数字・金額・日付・助数詞を入れて読み方を速査しよう！'
              );
            }}
            className={`game-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all ${
              station === 'lookup'
                ? 'bg-kohaku text-sumi border-aiiro-dark shadow-game-btn scale-[1.02]'
                : 'bg-washi text-sumi-muted border-washi-border hover:text-sumi'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>① 魔法のレジ（速査）</span>
          </button>

          <button
            onClick={() => {
              gameAudio.playClick();
              setStation('quiz');
              handleMoodChange(
                'excited',
                '『接客バトル・シナリオ道場』へようこそ！お客さんの注文をひらがな入力かマイク音声で読み上げよう！'
              );
            }}
            className={`game-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all ${
              station === 'quiz'
                ? 'bg-shuiro text-white border-aiiro-dark shadow-game-btn scale-[1.02]'
                : 'bg-washi text-sumi-muted border-washi-border hover:text-sumi'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>② 接客バトル（測験）</span>
          </button>

          <button
            onClick={() => {
              gameAudio.playPageFlip();
              setStation('scroll');
              handleMoodChange(
                'happy',
                '『秘伝・虎の巻』を開いたよ！マス目をクリックすると発音が聴けて、音変化フィルタも使えるよ！'
              );
            }}
            className={`game-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all ${
              station === 'scroll'
                ? 'bg-matcha text-white border-aiiro-dark shadow-game-btn scale-[1.02]'
                : 'bg-washi text-sumi-muted border-washi-border hover:text-sumi'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            <span>③ 秘伝・虎の巻（表一覧）</span>
          </button>
        </div>
      </div>

      {/* Active Station Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {station === 'lookup' && <QuickLookupGadget onMoodChange={handleMoodChange} />}
        {station === 'quiz' && (
          <ScenarioQuizDojo
            onMoodChange={handleMoodChange}
            forceMistakeMode={forceMistakeQuiz}
            onClearForceMistakeMode={onClearForceMistakeQuiz}
          />
        )}
        {station === 'scroll' && <KnowledgeScrollTable onMoodChange={handleMoodChange} />}
      </div>
    </div>
  );
};

