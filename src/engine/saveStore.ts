import { useEffect, useState } from 'react';

export interface MistakeEntry {
  id: string;
  targetDisplay: string;      // e.g. "3杯" or "4月20日"
  contextSentence: string;    // e.g. "すみません、生ビールを【 3杯 】ください！"
  correctReadings: string[];  // e.g. ["さんばい"]
  wrongInput: string;         // what player answered
  category: 'number_price' | 'date_time' | 'counter';
  explanation: string;
  mistakeCount: number;
  lastTimestamp: number;
}

export interface WordMasteryRecord {
  wordId: string;
  correctCount: number;
  wrongCount: number;
  stars: number;           // 0..3
  needsReview: boolean;
  lastWrongInput?: string;
  lastPracticedAt: number;
}

export interface PlayerSaveData {
  exp: number;
  coins: number;
  maxCombo: number;
  totalAnswered: number;
  totalCorrect: number;
  mistakes: MistakeEntry[];
  wordMastery: Record<string, WordMasteryRecord>;
}

const STORAGE_KEY = 'bushigi_shoutengai_save_v1';

const DEFAULT_SAVE: PlayerSaveData = {
  exp: 0,
  coins: 100,
  maxCombo: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  mistakes: [],
  wordMastery: {},
};

export interface PlayerRankInfo {
  level: number;
  title: string;
  badgeEmoji: string;
  currentLevelExp: number;
  nextLevelExp: number;
  progressPercent: number;
}

export function getPlayerRankInfo(exp: number): PlayerRankInfo {
  const expPerLevel = 250;
  const level = Math.floor(exp / expPerLevel) + 1;
  const currentLevelExp = exp % expPerLevel;
  const progressPercent = Math.min(100, Math.round((currentLevelExp / expPerLevel) * 100));

  let title = '見習い店員 (实习店员)';
  let badgeEmoji = '🌱';
  if (level >= 15) {
    title = 'ふしぎ商店街の伝説 (商店街传说)';
    badgeEmoji = '👑';
  } else if (level >= 10) {
    title = '名物大番頭 (王牌大掌柜)';
    badgeEmoji = '🏮';
  } else if (level >= 6) {
    title = '看板店員 (招牌店员)';
    badgeEmoji = '✨';
  } else if (level >= 3) {
    title = '一人前スタッフ (独当一面)';
    badgeEmoji = '🎋';
  }

  return {
    level,
    title,
    badgeEmoji,
    currentLevelExp,
    nextLevelExp: expPerLevel,
    progressPercent,
  };
}

class SaveStore {
  private data: PlayerSaveData;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.data = this.load();
  }

  private load(): PlayerSaveData {
    if (typeof window === 'undefined') return { ...DEFAULT_SAVE };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SAVE,
        ...parsed,
        mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
        wordMastery:
          parsed.wordMastery && typeof parsed.wordMastery === 'object'
            ? parsed.wordMastery
            : {},
      };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore quota error
    }
    this.listeners.forEach((fn) => fn());
  }

  public getData(): PlayerSaveData {
    return this.data;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public recordCorrectAnswer(combo: number, resolvedMistakeId?: string): { gainedExp: number; gainedCoins: number } {
    const gainedExp = 25 + Math.min(combo, 10) * 5;
    const gainedCoins = 15 + Math.min(combo, 10) * 3;

    let updatedMistakes = this.data.mistakes;
    if (resolvedMistakeId) {
      updatedMistakes = updatedMistakes.filter((m) => m.id !== resolvedMistakeId);
    }

    this.data = {
      ...this.data,
      exp: this.data.exp + gainedExp,
      coins: this.data.coins + gainedCoins,
      maxCombo: Math.max(this.data.maxCombo, combo),
      totalAnswered: this.data.totalAnswered + 1,
      totalCorrect: this.data.totalCorrect + 1,
      mistakes: updatedMistakes,
    };
    this.persist();
    return { gainedExp, gainedCoins };
  }

  public recordWrongAnswer(mistake: Omit<MistakeEntry, 'mistakeCount' | 'lastTimestamp'>) {
    const existingIdx = this.data.mistakes.findIndex(
      (m) => m.id === mistake.id || m.targetDisplay === mistake.targetDisplay
    );
    const updatedMistakes = [...this.data.mistakes];

    if (existingIdx >= 0) {
      const prev = updatedMistakes[existingIdx];
      updatedMistakes[existingIdx] = {
        ...prev,
        ...mistake,
        mistakeCount: prev.mistakeCount + 1,
        lastTimestamp: Date.now(),
      };
    } else {
      updatedMistakes.unshift({
        ...mistake,
        mistakeCount: 1,
        lastTimestamp: Date.now(),
      });
    }

    this.data = {
      ...this.data,
      totalAnswered: this.data.totalAnswered + 1,
      mistakes: updatedMistakes.slice(0, 50),
    };
    this.persist();
  }

  public removeMistake(id: string) {
    this.data = {
      ...this.data,
      mistakes: this.data.mistakes.filter((m) => m.id !== id),
    };
    this.persist();
  }

  public recordWordResult(
    wordId: string,
    isCorrect: boolean,
    combo: number,
    wrongInput?: string
  ): { gainedExp: number; gainedCoins: number } {
    const prev = this.data.wordMastery[wordId] || {
      wordId,
      correctCount: 0,
      wrongCount: 0,
      stars: 0,
      needsReview: false,
      lastPracticedAt: Date.now(),
    };

    const nextRecord: WordMasteryRecord = isCorrect
      ? {
          ...prev,
          correctCount: prev.correctCount + 1,
          stars: Math.min(3, prev.stars + 1),
          needsReview: false,
          lastPracticedAt: Date.now(),
        }
      : {
          ...prev,
          wrongCount: prev.wrongCount + 1,
          stars: Math.max(0, prev.stars - 1),
          needsReview: true,
          lastWrongInput: wrongInput,
          lastPracticedAt: Date.now(),
        };

    const gainedExp = isCorrect ? 25 + Math.min(combo, 10) * 5 : 0;
    const gainedCoins = isCorrect ? 15 + Math.min(combo, 10) * 3 : 0;

    this.data = {
      ...this.data,
      exp: this.data.exp + gainedExp,
      coins: this.data.coins + gainedCoins,
      maxCombo: isCorrect ? Math.max(this.data.maxCombo, combo) : this.data.maxCombo,
      totalAnswered: this.data.totalAnswered + 1,
      totalCorrect: isCorrect ? this.data.totalCorrect + 1 : this.data.totalCorrect,
      wordMastery: {
        ...this.data.wordMastery,
        [wordId]: nextRecord,
      },
    };
    this.persist();
    return { gainedExp, gainedCoins };
  }

  public clearWordReview(wordId: string) {
    const prev = this.data.wordMastery[wordId];
    if (!prev) return;
    this.data = {
      ...this.data,
      wordMastery: {
        ...this.data.wordMastery,
        [wordId]: {
          ...prev,
          needsReview: false,
        },
      },
    };
    this.persist();
  }
}

export const saveStore = new SaveStore();

export function usePlayerSave(): PlayerSaveData {
  const [state, setState] = useState<PlayerSaveData>(() => saveStore.getData());
  useEffect(() => {
    return saveStore.subscribe(() => {
      setState({ ...saveStore.getData() });
    });
  }, []);
  return state;
}

