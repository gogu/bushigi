import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Map, Flame, Coins, BookOpen } from 'lucide-react';
import { gameAudio } from '../engine/audio';
import { getPlayerRankInfo, usePlayerSave } from '../engine/saveStore';

interface GameStageProps {
  activeGameTitle?: string;
  onReturnToMap?: () => void;
  onOpenMistakeQuiz?: () => void;
  children: React.ReactNode;
}

interface SakuraPetal {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  type: 'sakura' | 'orb';
}

export const GameStage: React.FC<GameStageProps> = ({
  activeGameTitle,
  onReturnToMap,
  onOpenMistakeQuiz,
  children,
}) => {
  const save = usePlayerSave();
  const rank = getPlayerRankInfo(save.exp);
  const [soundOn, setSoundOn] = useState<boolean>(gameAudio.enabled);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas background sakura & warm lantern orb particle loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const petals: SakuraPetal[] = Array.from({ length: 26 }, (_, idx) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: idx % 3 === 0 ? 5 + Math.random() * 5 : 4 + Math.random() * 4,
      speedX: -0.35 + Math.random() * 0.9,
      speedY: 0.4 + Math.random() * 0.7,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (-0.015 + Math.random() * 0.03),
      opacity: 0.18 + Math.random() * 0.25,
      type: idx % 4 === 0 ? 'orb' : 'sakura',
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of petals) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotSpeed;

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.x < -20) p.x = canvas.width + 20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        if (p.type === 'sakura') {
          ctx.fillStyle = '#F27D6D';
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.bezierCurveTo(p.size, -p.size, p.size, p.size, 0, p.size);
          ctx.bezierCurveTo(-p.size, p.size, -p.size, -p.size, 0, -p.size);
          ctx.fill();
        } else {
          ctx.fillStyle = '#F4A261';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    gameAudio.setEnabled(next);
    if (next) gameAudio.playClick();
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-washi-pattern overflow-hidden select-none">
      {/* Ambient Particle Layer */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* Top Game Console HUD Bar */}
      <header className="relative z-20 h-16 px-3 sm:px-6 bg-seigaiha-header border-b-4 border-aiiro-dark text-washi-light flex items-center justify-between shadow-lg shrink-0">
        {/* Left: Brand & Back to Map Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onReturnToMap ? (
            <button
              onClick={() => {
                gameAudio.playClick();
                onReturnToMap();
              }}
              onMouseEnter={() => gameAudio.playHover()}
              className="game-btn flex items-center gap-1.5 bg-shuiro hover:bg-shuiro-light text-white font-extrabold px-3 py-1.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn text-xs sm:text-sm"
            >
              <Map className="w-4 h-4" />
              <span>商店街マップへ</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-aiiro-dark/80 px-3 py-1.5 rounded-xl border-2 border-kohaku/60">
              <span className="text-xl">🏮</span>
              <div>
                <div className="font-extrabold text-sm sm:text-base tracking-wide text-kohaku-light leading-none">
                  ふしぎ商店街
                </div>
                <div className="text-[10px] text-washi-dark/80 font-medium hidden sm:block">
                  BUSHIGI SHOUTENGAI · 日本語修行ゲーム
                </div>
              </div>
            </div>
          )}

          {activeGameTitle && (
            <div className="hidden md:flex items-center gap-2 bg-aiiro-dark/70 px-3 py-1 rounded-xl border border-washi-border/30">
              <span className="text-kohaku text-xs font-bold">STAGE 01</span>
              <span className="text-washi-light font-extrabold text-sm">{activeGameTitle}</span>
            </div>
          )}
        </div>

        {/* Center: Player Level & EXP Gauge */}
        <div className="flex items-center gap-2 sm:gap-3 bg-aiiro-dark/85 px-3 py-1.5 rounded-2xl border-2 border-washi-border/40">
          <div className="w-8 h-8 rounded-xl bg-kohaku/20 border border-kohaku flex items-center justify-center text-lg">
            {rank.badgeEmoji}
          </div>
          <div className="min-w-[115px] sm:min-w-[165px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-extrabold text-kohaku-light">Lv.{rank.level}</span>
              <span className="text-[11px] font-bold text-washi-dark truncate max-w-[110px] sm:max-w-[140px]">
                {rank.title}
              </span>
            </div>
            <div className="w-full h-2 bg-aiiro rounded-full overflow-hidden border border-washi-border/30">
              <div
                className="h-full bg-gradient-to-r from-kohaku to-shuiro transition-all duration-500"
                style={{ width: `${rank.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Stats Pills (Mistakes, Combo, Coins, SFX) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Mistake Notebook Shortcut */}
          {onOpenMistakeQuiz && (
            <button
              onClick={() => {
                gameAudio.playClick();
                onOpenMistakeQuiz();
              }}
              onMouseEnter={() => gameAudio.playHover()}
              title="弱点ノート（错题手账）"
              className="game-btn flex items-center gap-1.5 bg-washi text-sumi px-2.5 py-1.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn text-xs font-extrabold"
            >
              <BookOpen className="w-3.5 h-3.5 text-shuiro" />
              <span className="hidden sm:inline">弱点帳</span>
              <span className="px-1.5 py-0.2 rounded-full bg-shuiro text-white text-[11px]">
                {save.mistakes.length}
              </span>
            </button>
          )}

          {/* Max Combo Pill */}
          <div
            title="最高連続正解コンボ"
            className="hidden sm:flex items-center gap-1 bg-aiiro-dark/80 px-2.5 py-1.5 rounded-xl border border-shuiro/50 text-xs font-extrabold"
          >
            <Flame className="w-3.5 h-3.5 text-shuiro-light" />
            <span className="text-washi-dark">MAX</span>
            <span className="text-kohaku-light">{save.maxCombo}連</span>
          </div>

          {/* Coin Pouch Pill */}
          <div
            title="所持コイン"
            className="flex items-center gap-1 bg-aiiro-dark/80 px-2.5 py-1.5 rounded-xl border border-kohaku/60 text-xs font-extrabold"
          >
            <Coins className="w-3.5 h-3.5 text-kohaku" />
            <span className="text-kohaku-light">{save.coins.toLocaleString()}</span>
            <span className="text-[10px] text-washi-dark">G</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundOn ? '効果音 ON' : '効果音 OFF'}
            className={`game-btn p-2 rounded-xl border-2 border-aiiro-dark shadow-game-btn ${
              soundOn ? 'bg-matcha text-white' : 'bg-aiiro text-washi-dark'
            }`}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Game Viewport Content */}
      <main className="relative z-10 flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
};

