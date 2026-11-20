import React, { useState } from 'react';
import { GameStage } from './components/GameStage';
import { WorldMapMenu } from './components/WorldMapMenu';
import { CounterShopStation, NumberCounterShopGame } from './games/numberCounterShop/NumberCounterShopGame';
import { WordShopStation, WordSpellingShopGame } from './games/wordSpellingShop/WordSpellingShopGame';
import { MINI_GAMES_MANIFEST } from './engine/gameRegistry';
import { usePlayerSave } from './engine/saveStore';

export const App: React.FC = () => {
  const save = usePlayerSave();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [counterStation, setCounterStation] = useState<CounterShopStation>('lookup');
  const [wordStation, setWordStation] = useState<WordShopStation>('arena');
  const [forceCounterMistake, setForceCounterMistake] = useState<boolean>(false);
  const [forceWordReview, setForceWordReview] = useState<boolean>(false);

  const activeGame = MINI_GAMES_MANIFEST.find((g) => g.id === activeGameId);
  const wordReviewCount = Object.values(save.wordMastery).filter((m) => m.needsReview).length;

  const weaknessCount =
    activeGameId === 'word-spelling-shop'
      ? wordReviewCount
      : activeGameId === 'number-counter-shop'
      ? save.mistakes.length
      : save.mistakes.length + wordReviewCount;

  const handleSelectGame = (gameId: string, station?: string) => {
    if (gameId === 'word-spelling-shop') {
      const targetStation: WordShopStation =
        station === 'gallery' || station === 'mastery' ? station : 'arena';
      setWordStation(targetStation);
    } else {
      const targetStation: CounterShopStation =
        station === 'quiz' || station === 'scroll' ? station : 'lookup';
      setCounterStation(targetStation);
    }
    setActiveGameId(gameId);
  };

  const handleOpenMistakeQuiz = () => {
    if (activeGameId === 'word-spelling-shop' || (activeGameId === null && save.mistakes.length === 0 && wordReviewCount > 0)) {
      setActiveGameId('word-spelling-shop');
      setWordStation('arena');
      setForceWordReview(true);
    } else {
      setActiveGameId('number-counter-shop');
      setCounterStation('quiz');
      setForceCounterMistake(true);
    }
  };

  return (
    <GameStage
      activeGameTitle={activeGame?.shopName}
      activeStageNumber={activeGame?.stageNumber}
      weaknessCount={weaknessCount}
      onReturnToMap={activeGameId ? () => setActiveGameId(null) : undefined}
      onOpenMistakeQuiz={handleOpenMistakeQuiz}
    >
      {!activeGameId ? (
        <WorldMapMenu onSelectGame={handleSelectGame} />
      ) : activeGameId === 'number-counter-shop' ? (
        <NumberCounterShopGame
          initialStation={counterStation}
          forceMistakeQuiz={forceCounterMistake}
          onClearForceMistakeQuiz={() => setForceCounterMistake(false)}
        />
      ) : activeGameId === 'word-spelling-shop' ? (
        <WordSpellingShopGame
          initialStation={wordStation}
          forceReviewMode={forceWordReview}
          onClearForceReviewMode={() => setForceWordReview(false)}
        />
      ) : null}
    </GameStage>
  );
};

export default App;
