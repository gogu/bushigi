import React, { useState } from 'react';
import { GameStage } from './components/GameStage';
import { WorldMapMenu } from './components/WorldMapMenu';
import { CounterShopStation, NumberCounterShopGame } from './games/numberCounterShop/NumberCounterShopGame';
import { MINI_GAMES_MANIFEST } from './engine/gameRegistry';

export const App: React.FC = () => {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [initialStation, setInitialStation] = useState<CounterShopStation>('lookup');
  const [forceMistakeQuiz, setForceMistakeQuiz] = useState<boolean>(false);

  const activeGame = MINI_GAMES_MANIFEST.find((g) => g.id === activeGameId);

  const handleSelectGame = (gameId: string, station: CounterShopStation = 'lookup') => {
    setInitialStation(station);
    setActiveGameId(gameId);
  };

  const handleOpenMistakeQuiz = () => {
    setActiveGameId('number-counter-shop');
    setInitialStation('quiz');
    setForceMistakeQuiz(true);
  };

  return (
    <GameStage
      activeGameTitle={activeGame?.shopName}
      onReturnToMap={activeGameId ? () => setActiveGameId(null) : undefined}
      onOpenMistakeQuiz={handleOpenMistakeQuiz}
    >
      {!activeGameId ? (
        <WorldMapMenu onSelectGame={handleSelectGame} />
      ) : activeGameId === 'number-counter-shop' ? (
        <NumberCounterShopGame
          initialStation={initialStation}
          forceMistakeQuiz={forceMistakeQuiz}
          onClearForceMistakeQuiz={() => setForceMistakeQuiz(false)}
        />
      ) : null}
    </GameStage>
  );
};

export default App;

