import React from 'react';
import { motion } from 'framer-motion';

export type CharacterMood = 'idle' | 'happy' | 'excited' | 'thinking' | 'oops';

interface ShopkeeperAvatarProps {
  mood?: CharacterMood;
  size?: 'sm' | 'md' | 'lg';
  speechText?: string;
  characterName?: string;
}

export const ShopkeeperAvatar: React.FC<ShopkeeperAvatarProps> = ({
  mood = 'idle',
  size = 'md',
  speechText,
  characterName = '看板娘 コハル & ぽん太',
}) => {
  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  }[size];

  const moodBadge = {
    idle: '🍵',
    happy: '🌸',
    excited: '🎉',
    thinking: '💭',
    oops: '💦',
  }[mood];

  return (
    <div className="flex items-center gap-3">
      {/* Character Portrait Frame */}
      <motion.div
        animate={
          mood === 'excited'
            ? { y: [0, -6, 0], rotate: [0, -3, 3, 0] }
            : mood === 'happy'
            ? { y: [0, -4, 0] }
            : mood === 'oops'
            ? { x: [0, -4, 4, -2, 2, 0] }
            : { y: [0, -2, 0] }
        }
        transition={{
          duration: mood === 'idle' ? 2.6 : 0.5,
          repeat: mood === 'idle' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className={`relative ${sizeClasses} rounded-2xl bg-gradient-to-b from-kohaku-light to-washi-dark border-4 border-aiiro shadow-game-btn flex items-center justify-center shrink-0 overflow- visible`}
      >
        {/* Custom Japanese Anime/Chibi Style SVG Shopkeeper + Tanuki */}
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-xl overflow-hidden">
          {/* Warm Shop Background */}
          <rect width="100" height="100" fill="#FAF3E0" />
          <circle cx="50" cy="52" r="40" fill="#F4A261" opacity="0.22" />

          {/* Kimono / Apron Collar */}
          <path d="M22 98 C25 74, 75 74, 78 98 Z" fill="#E05A47" />
          <path d="M38 76 L50 94 L62 76" fill="#FFFDF7" stroke="#2D4059" strokeWidth="2.5" />

          {/* Hair Back */}
          <path d="M22 48 C18 70, 26 84, 32 86 L68 86 C74 84, 82 70, 78 48 Z" fill="#2D4059" />

          {/* Side Hair Buns / Odango with Kanzashi */}
          <circle cx="20" cy="36" r="11" fill="#2D4059" />
          <circle cx="80" cy="36" r="11" fill="#2D4059" />
          <circle cx="20" cy="36" r="6" fill="#E05A47" />
          <circle cx="80" cy="36" r="6" fill="#E05A47" />

          {/* Face */}
          <ellipse cx="50" cy="52" rx="24" ry="22" fill="#FFE8D6" stroke="#2D4059" strokeWidth="2.5" />

          {/* Blush */}
          <ellipse cx="34" cy="57" rx="4.5" ry="2.5" fill="#F27D6D" opacity="0.65" />
          <ellipse cx="66" cy="57" rx="4.5" ry="2.5" fill="#F27D6D" opacity="0.65" />

          {/* Front Bangs */}
          <path
            d="M25 46 C26 26, 74 26, 75 46 C67 36, 58 44, 50 35 C42 44, 33 36, 25 46 Z"
            fill="#2D4059"
          />

          {/* Eyes based on mood */}
          {mood === 'happy' || mood === 'excited' ? (
            <>
              <path d="M35 50 Q40 43 45 50" fill="none" stroke="#2D4059" strokeWidth="3" strokeLinecap="round" />
              <path d="M55 50 Q60 43 65 50" fill="none" stroke="#2D4059" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : mood === 'oops' ? (
            <>
              <path d="M35 46 L44 51 L35 54" fill="none" stroke="#2D4059" strokeWidth="2.8" strokeLinecap="round" />
              <path d="M65 46 L56 51 L65 54" fill="none" stroke="#2D4059" strokeWidth="2.8" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="39" cy="50" r="3.6" fill="#2D4059" />
              <circle cx="61" cy="50" r="3.6" fill="#2D4059" />
              <circle cx="40.2" cy="48.6" r="1.2" fill="#FFFFFF" />
              <circle cx="62.2" cy="48.6" r="1.2" fill="#FFFFFF" />
            </>
          )}

          {/* Mouth based on mood */}
          {mood === 'excited' ? (
            <path d="M44 59 Q50 68 56 59 Z" fill="#E05A47" stroke="#2D4059" strokeWidth="2" />
          ) : mood === 'happy' ? (
            <path d="M44 59 Q50 65 56 59" fill="none" stroke="#2D4059" strokeWidth="2.5" strokeLinecap="round" />
          ) : mood === 'thinking' ? (
            <circle cx="51" cy="61" r="2.5" fill="#2D4059" />
          ) : mood === 'oops' ? (
            <path d="M45 63 Q50 58 55 63" fill="none" stroke="#2D4059" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <path d="M46 60 Q50 63 54 60" fill="none" stroke="#2D4059" strokeWidth="2.2" strokeLinecap="round" />
          )}

          {/* Mini Tanuki Leaf on Head */}
          <path d="M48 22 C54 14, 65 18, 56 26 Z" fill="#4A7C59" stroke="#2D4059" strokeWidth="1.8" />
        </svg>

        {/* Mood Emote Bubble */}
        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-washi-light border-2 border-aiiro flex items-center justify-center text-sm shadow">
          {moodBadge}
        </span>
      </motion.div>

      {/* Speech Bubble */}
      {speechText && (
        <div className="relative bg-washi-light border-2 border-aiiro rounded-2xl px-4 py-2.5 shadow-sm max-w-xl">
          <div className="text-[11px] font-bold text-shuiro tracking-wider mb-0.5 flex items-center gap-1.5">
            <span>🏮 {characterName}</span>
          </div>
          <p className="text-sm font-bold text-sumi leading-snug">{speechText}</p>
        </div>
      )}
    </div>
  );
};

