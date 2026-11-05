import React from 'react';

export interface MiniGameProps {
  onBackToMap: () => void;
  initialStation?: 'lookup' | 'quiz' | 'scroll';
}

export interface MiniGameManifest {
  id: string;
  stageNumber: number;
  shopName: string;          // e.g. "かず・カウンター屋"
  title: string;             // e.g. "数字・日付・助数詞 修行処"
  subtitle: string;          // Chinese description
  badgeText: string;         // e.g. "STAGE 01"
  emoji: string;             // Shop signboard icon
  accentColor: 'shuiro' | 'matcha' | 'kohaku' | 'aiiro';
  status: 'playable' | 'coming_soon';
  features: string[];
  component?: React.ComponentType<MiniGameProps>;
}

// We register the manifest metadata here and bind the component in App or lazy import
export const MINI_GAMES_MANIFEST: MiniGameManifest[] = [
  {
    id: 'number-counter-shop',
    stageNumber: 1,
    shopName: 'かず・カウンター屋',
    title: '数字・日付・価格・助数詞 万能店',
    subtitle: '地道日语数字、日期、金额与 10 大量词的速查机关、情景接待对决与秘传虎之卷',
    badgeText: 'STAGE 01 · 営業中',
    emoji: '🧮',
    accentColor: 'shuiro',
    status: 'playable',
    features: [
      '📟 魔法のレジ：数字/价格/日期/量词实时音变速查',
      '🎙️ 接客バトル：情景对话填空 + 罗马音转假名 + 语音判分',
      '📜 秘伝・虎の巻：促音/连浊/特殊训读手账图鉴汇总',
    ],
  },
  {
    id: 'teishoku-keigo-shop',
    stageNumber: 2,
    shopName: 'ていしょく屋・敬語食堂',
    title: '注文・接客・尊敬語と謙譲語',
    subtitle: '餐厅点单、便利店敬语、尊他与自谦语的料理配菜闯关游戏（可扩展卡槽）',
    badgeText: 'STAGE 02 · 準備中',
    emoji: '🍱',
    accentColor: 'kohaku',
    status: 'coming_soon',
    features: [
      '🍵 敬語変換ガチャ：常体/敬体/尊他/自谦极速转换',
      '🥢 居酒屋注文パズル：听顾客语音点单摆盘',
      '📖 接客フレーズ手帖：高频打工与旅游会话汇总',
    ],
  },
  {
    id: 'ekimae-koutsuu-shop',
    stageNumber: 3,
    shopName: 'えきまえ案内所・乗換案内',
    title: '方向・位置・交通と道のり',
    subtitle: '车站指路、左右前后位置关系、电车换乘广播听力挑战（可扩展卡槽）',
    badgeText: 'STAGE 03 · 準備中',
    emoji: '🚉',
    accentColor: 'matcha',
    status: 'coming_soon',
    features: [
      '🗺️ 道案内マップ：根据日语指示在商店街寻宝',
      '🚃 構内アナウンス聴解：几号站台与发车时刻速听',
      '🧭 位置詞コンパス：こそあど与方位词全表',
    ],
  },
  {
    id: 'onomatopoeia-zakka',
    stageNumber: 4,
    shopName: 'オノマトペ雑貨店',
    title: '擬音語・擬態語コレクション',
    subtitle: '日语拟声词与拟态词（ふわふわ、ペコペコ、ギリギリ）卡牌配对（可扩展卡槽）',
    badgeText: 'STAGE 04 · 準備中',
    emoji: '🎐',
    accentColor: 'aiiro',
    status: 'coming_soon',
    features: [
      '🃏 音感カード合わせ：动画场景配对地道拟声词',
      '🎭 感情・状態スライダー：微差拟态词对比速查',
      '📚 オノマトペ図鑑：生活高频 100 词分类表',
    ],
  },
];

