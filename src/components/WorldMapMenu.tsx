import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play, Lock, Calculator, MessageSquareHeart, ScrollText, Trophy, CheckCircle2 } from 'lucide-react';
import { MINI_GAMES_MANIFEST, MiniGameManifest } from '../engine/gameRegistry';
import { gameAudio } from '../engine/audio';
import { usePlayerSave } from '../engine/saveStore';
import { ShopkeeperAvatar } from './ShopkeeperAvatar';

interface WorldMapMenuProps {
  onSelectGame: (gameId: string, initialStation?: 'lookup' | 'quiz' | 'scroll') => void;
}

export const WorldMapMenu: React.FC<WorldMapMenuProps> = ({ onSelectGame }) => {
  const save = usePlayerSave();
  const [hoveredShop, setHoveredShop] = useState<string | null>('number-counter-shop');
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const accuracy =
    save.totalAnswered > 0 ? Math.round((save.totalCorrect / save.totalAnswered) * 100) : 100;

  const handleCardClick = (game: MiniGameManifest) => {
    if (game.status === 'playable') {
      gameAudio.playCashRegister();
      onSelectGame(game.id, 'lookup');
    } else {
      gameAudio.playError();
      setLockedNotice(`『${game.shopName}』は現在開店準備中です！まずは第1関「かず・カウンター屋」で修行しましょう♪`);
    }
  };

  const norenColorMap: Record<MiniGameManifest['accentColor'], string> = {
    shuiro: 'bg-shuiro border-shuiro-dark text-white',
    kohaku: 'bg-kohaku border-kohaku-dark text-sumi',
    matcha: 'bg-matcha border-matcha-dark text-white',
    aiiro: 'bg-aiiro border-aiiro-dark text-white',
  };

  return (
    <div className="flex-1 h-full overflow-y-auto game-scroll px-4 sm:px-8 py-4 sm:py-6 flex flex-col justify-between max-w-7xl mx-auto w-full gap-4">
      {/* Top Welcome Banner + Quick Stats */}
      <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 sm:p-5 shadow-game-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <ShopkeeperAvatar
          mood={lockedNotice ? 'thinking' : 'happy'}
          size="md"
          speechText={
            lockedNotice ||
            'ようこそ「ふしぎ商店街」へ！ここでは日本の数字・日付・お金・助数詞（量詞）の本物の言い方を楽しく修行できるよ！'
          }
        />

        {/* Player Street Record Dashboard */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <div className="bg-washi border-2 border-washi-border rounded-2xl px-3.5 py-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-kohaku-dark" />
            <div>
              <div className="text-[10px] font-bold text-sumi-muted">接客正解数</div>
              <div className="text-sm font-extrabold text-sumi">{save.totalCorrect} 回</div>
            </div>
          </div>

          <div className="bg-washi border-2 border-washi-border rounded-2xl px-3.5 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-matcha" />
            <div>
              <div className="text-[10px] font-bold text-sumi-muted">正解率</div>
              <div className="text-sm font-extrabold text-matcha-dark">{accuracy}%</div>
            </div>
          </div>

          {/* Direct Station Launch Shortcuts for Stage 1 */}
          <div className="flex items-center gap-1.5 bg-aiiro/5 p-1.5 rounded-2xl border border-aiiro/20">
            <button
              onClick={() => {
                gameAudio.playCashRegister();
                onSelectGame('number-counter-shop', 'lookup');
              }}
              onMouseEnter={() => gameAudio.playHover()}
              className="game-btn flex items-center gap-1 bg-kohaku hover:bg-kohaku-light text-sumi font-extrabold text-xs px-3 py-2 rounded-xl border-2 border-aiiro shadow-game-btn"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>速査レジ</span>
            </button>
            <button
              onClick={() => {
                gameAudio.playCashRegister();
                onSelectGame('number-counter-shop', 'quiz');
              }}
              onMouseEnter={() => gameAudio.playHover()}
              className="game-btn flex items-center gap-1 bg-shuiro hover:bg-shuiro-light text-white font-extrabold text-xs px-3 py-2 rounded-xl border-2 border-aiiro shadow-game-btn"
            >
              <MessageSquareHeart className="w-3.5 h-3.5" />
              <span>接客測験</span>
            </button>
            <button
              onClick={() => {
                gameAudio.playCashRegister();
                onSelectGame('number-counter-shop', 'scroll');
              }}
              onMouseEnter={() => gameAudio.playHover()}
              className="game-btn flex items-center gap-1 bg-matcha hover:bg-matcha-light text-white font-extrabold text-xs px-3 py-2 rounded-xl border-2 border-aiiro shadow-game-btn"
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>虎の巻表</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="bg-aiiro text-kohaku-light text-xs font-extrabold px-3 py-1 rounded-full border-2 border-aiiro-dark">
            🗺️ 商店街ステージ選択 (STAGE SELECT)
          </span>
          <span className="text-xs sm:text-sm font-bold text-sumi-muted">
            遊びたいお店を選んで入店しよう！（プラグイン式で店舗を拡張可能）
          </span>
        </div>
      </div>

      {/* Storefront Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
        {MINI_GAMES_MANIFEST.map((game, index) => {
          const isPlayable = game.status === 'playable';
          const isHovered = hoveredShop === game.id;

          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              onMouseEnter={() => {
                setHoveredShop(game.id);
                gameAudio.playHover();
              }}
              onClick={() => handleCardClick(game)}
              className={`relative rounded-3xl border-4 transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                isPlayable
                  ? 'bg-washi-light border-aiiro shadow-game-card hover:border-shuiro'
                  : 'bg-washi-dark/75 border-aiiro/50 opacity-85 hover:opacity-100'
              }`}
            >
              {/* Japanese Shop Noren Curtain Header (暖簾) */}
              <div className={`${norenColorMap[game.accentColor]} border-b-4 px-5 py-3 flex items-center justify-between relative`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl sm:text-3xl drop-shadow">{game.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/25">
                        {game.badgeText}
                      </span>
                      {isPlayable && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-washi-light text-shuiro px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3" /> おすすめ
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                      {game.shopName}
                    </h2>
                  </div>
                </div>

                {/* Hanging Lantern Icon */}
                <div className="w-10 h-10 rounded-2xl bg-washi-light/20 border-2 border-white/40 flex items-center justify-center text-xl">
                  {isPlayable ? '🏮' : '🔒'}
                </div>
              </div>

              {/* Shop Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-aiiro mb-1">{game.title}</div>
                  <p className="text-xs font-bold text-sumi-muted leading-relaxed">
                    {game.subtitle}
                  </p>

                  {/* Feature List Pills */}
                  <div className="mt-3 space-y-1.5">
                    {game.features.map((feat, i) => (
                      <div
                        key={i}
                        className="text-xs font-bold bg-washi border border-washi-border rounded-xl px-3 py-1.5 text-sumi flex items-center gap-2"
                      >
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-2 flex items-center justify-between border-t-2 border-dashed border-washi-border">
                  {isPlayable ? (
                    <>
                      <div className="text-xs font-extrabold text-matcha-dark flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-matcha animate-ping" />
                        <span>3つの修行モード搭載・音声認識対応</span>
                      </div>
                      <button
                        className={`game-btn flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-sm border-2 border-aiiro-dark shadow-game-btn ${
                          isHovered ? 'bg-shuiro text-white' : 'bg-kohaku text-sumi'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>入店する</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-sumi-muted flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>拡張スロット（今後のアップデートで開店）</span>
                      </div>
                      <span className="text-xs font-extrabold bg-washi-dark text-sumi-muted px-3 py-1.5 rounded-xl border border-washi-border">
                        準備中
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

