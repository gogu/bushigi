import * as wanakana from 'wanakana';
import { WordEntry, WordScriptType, getWordById } from '../data/wordDecks';

export type DiffStatus = 'match' | 'wrong' | 'missing' | 'extra';

export interface SpellingDiffCell {
  expected?: string;
  actual?: string;
  status: DiffStatus;
}

export type DiagnosticKind =
  | 'script_mismatch'
  | 'long_vowel'
  | 'dakuten'
  | 'small_yoon'
  | 'confusable_word'
  | 'alternate_reading';

export interface SpellingDiagnostic {
  kind: DiagnosticKind;
  title: string;
  detail: string;
}

export interface SpellingCheckResult {
  isCorrect: boolean;
  isAlternateRetry: boolean;
  normalizedInput: string;
  expected: string;
  diffCells: SpellingDiffCell[];
  diagnostics: SpellingDiagnostic[];
}

const SMALL_LARGE_PAIR: Record<string, string> = {
  ゃ: 'や', や: 'ゃ',
  ゅ: 'ゆ', ゆ: 'ゅ',
  ょ: 'よ', よ: 'ょ',
  っ: 'つ', つ: 'っ',
  ぁ: 'あ', あ: 'ぁ',
  ぃ: 'い', い: 'ぃ',
  ぅ: 'う', う: 'ぅ',
  ぇ: 'え', え: 'ぇ',
  ぉ: 'お', お: 'ぉ',
  ャ: 'ヤ', ヤ: 'ャ',
  ュ: 'ユ', ユ: 'ュ',
  ョ: 'ヨ', ヨ: 'ョ',
  ッ: 'ツ', ツ: 'ッ',
  ァ: 'ア', ア: 'ァ',
  ィ: 'イ', イ: 'ィ',
  ゥ: 'ウ', ウ: 'ゥ',
  ェ: 'エ', エ: 'ェ',
  ォ: 'オ', オ: 'ォ',
};

const KANA_VOWELS = new Set(['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ']);

function stripDakuten(ch: string): string {
  return ch.normalize('NFD').replace(/[\u3099\u309A]/g, '').normalize('NFC');
}

/**
 * Live IME-style input converter matching the word's script type.
 */
export function convertLiveInput(raw: string, scriptType: WordScriptType): string {
  if (scriptType === 'katakana') {
    return wanakana.toKatakana(raw, { IMEMode: true });
  }
  return wanakana.toHiragana(raw, { IMEMode: true });
}

/**
 * Normalizes a submitted string while preserving intentionally typed script
 * when no ASCII Romaji remains.
 */
export function normalizeSubmission(raw: string, scriptType: WordScriptType): string {
  const clean = raw.trim().replace(/[\s　。、！？!?・「」『』【】（）()]/g, '');
  if (!clean) return '';

  if (/[a-zA-Z-]/.test(clean)) {
    return scriptType === 'katakana' ? wanakana.toKatakana(clean) : wanakana.toHiragana(clean);
  }
  return clean;
}

function emitGap(expGap: string[], actGap: string[], cells: SpellingDiffCell[]) {
  const maxLen = Math.max(expGap.length, actGap.length);
  for (let i = 0; i < maxLen; i++) {
    const exp = expGap[i];
    const act = actGap[i];
    if (exp !== undefined && act !== undefined) {
      cells.push({ expected: exp, actual: act, status: 'wrong' });
    } else if (exp !== undefined) {
      cells.push({ expected: exp, status: 'missing' });
    } else if (act !== undefined) {
      cells.push({ actual: act, status: 'extra' });
    }
  }
}

/**
 * Aligns expected and actual character sequences using Longest Common Subsequence (LCS).
 */
export function computeSpellingDiff(expected: string, actual: string): SpellingDiffCell[] {
  const expChars = Array.from(expected);
  const actChars = Array.from(actual);
  const m = expChars.length;
  const n = actChars.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (expChars[i] === actChars[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const cells: SpellingDiffCell[] = [];
  let i = 0;
  let j = 0;
  let expGap: string[] = [];
  let actGap: string[] = [];

  while (i < m && j < n) {
    if (expChars[i] === actChars[j]) {
      if (expGap.length > 0 || actGap.length > 0) {
        emitGap(expGap, actGap, cells);
        expGap = [];
        actGap = [];
      }
      cells.push({ expected: expChars[i], actual: actChars[j], status: 'match' });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      expGap.push(expChars[i]);
      i++;
    } else {
      actGap.push(actChars[j]);
      j++;
    }
  }

  while (i < m) {
    expGap.push(expChars[i]);
    i++;
  }
  while (j < n) {
    actGap.push(actChars[j]);
    j++;
  }
  if (expGap.length > 0 || actGap.length > 0) {
    emitGap(expGap, actGap, cells);
  }

  return cells;
}

/**
 * Evaluates a player's spelling submission and returns character-level diff
 * plus targeted Japanese phonetic diagnostics.
 */
export function checkJapaneseSpelling(rawInput: string, entry: WordEntry): SpellingCheckResult {
  const normalizedInput = normalizeSubmission(rawInput, entry.scriptType);
  const expected = entry.reading;

  if (normalizedInput === expected) {
    return {
      isCorrect: true,
      isAlternateRetry: false,
      normalizedInput,
      expected,
      diffCells: Array.from(expected).map((ch) => ({ expected: ch, actual: ch, status: 'match' })),
      diagnostics: [],
    };
  }

  // Alternate reading check (e.g. "いえ" for 家 -> prompt retry for "うち" without penalty)
  if (
    entry.alternateNote &&
    normalizedInput &&
    wanakana.toHiragana(normalizedInput) === entry.alternateNote.input
  ) {
    return {
      isCorrect: false,
      isAlternateRetry: true,
      normalizedInput,
      expected,
      diffCells: computeSpellingDiff(expected, normalizedInput),
      diagnostics: [
        {
          kind: 'alternate_reading',
          title: '別の読み方（换个读法试试）',
          detail: entry.alternateNote.message,
        },
      ],
    };
  }

  const diffCells = computeSpellingDiff(expected, normalizedInput);
  const diagnostics: SpellingDiagnostic[] = [];

  // 1. Confusable word check (e.g. elevator <-> escalator)
  if (entry.confusableWith && entry.confusableWith.length > 0) {
    for (const confId of entry.confusableWith) {
      const confWord = getWordById(confId);
      if (
        confWord &&
        (normalizedInput === confWord.reading ||
          wanakana.toKatakana(normalizedInput) === confWord.reading ||
          wanakana.toHiragana(normalizedInput) === wanakana.toHiragana(confWord.reading))
      ) {
        diagnostics.push({
          kind: 'confusable_word',
          title: '混同注意（易混词警报）',
          detail: `你拼出的是「${confWord.display}（${confWord.meaning}）」，本题是「${entry.meaning}」，注意区分！`,
        });
        break;
      }
    }
  }

  // 2. Script mismatch check (hiragana vs katakana)
  const actualChars = Array.from(normalizedInput);
  const hasHiragana = actualChars.some((c) => wanakana.isHiragana(c));
  const hasKatakana = actualChars.some((c) => wanakana.isKatakana(c));
  if (entry.scriptType === 'katakana' && hasHiragana) {
    const phoneticallyClose =
      wanakana.toKatakana(normalizedInput) === expected ||
      wanakana.toHiragana(expected) === normalizedInput ||
      normalizedInput.replace(/ー/g, '') === wanakana.toHiragana(expected);
    diagnostics.push({
      kind: 'script_mismatch',
      title: '文字種チェック（平/片假名提醒）',
      detail: phoneticallyClose
        ? `读音方向是对的！但这是外来语，需要用片假名「${expected}」拼写哦。`
        : `本题是外来语词汇，请用片假名（カタカナ）拼写「${expected}」。`,
    });
  } else if (entry.scriptType === 'hiragana' && hasKatakana) {
    const phoneticallyClose = wanakana.toHiragana(normalizedInput) === expected;
    diagnostics.push({
      kind: 'script_mismatch',
      title: '文字種チェック（平/片假名提醒）',
      detail: phoneticallyClose
        ? `读音是对的！但这是和语/汉字词，请使用平假名「${expected}」拼写。`
        : `本题不是外来语，请使用平假名（ひらがな）拼写「${expected}」。`,
    });
  }

  // 3. Long vowel error check (ー, う, い, お, or katakana vowel substitution)
  const longVowelCell = diffCells.find((cell, idx) => {
    if (cell.status === 'missing') {
      if (cell.expected === 'ー') return true;
      if (idx > 0 && (cell.expected === 'う' || cell.expected === 'い' || cell.expected === 'お')) return true;
    }
    if (cell.status === 'extra') {
      if (cell.actual === 'ー') return true;
      if (idx > 0 && (cell.actual === 'う' || cell.actual === 'い' || cell.actual === 'お')) return true;
    }
    if (cell.status === 'wrong' && cell.expected === 'ー' && cell.actual && KANA_VOWELS.has(cell.actual)) {
      return true;
    }
    return false;
  });
  if (longVowelCell) {
    diagnostics.push({
      kind: 'long_vowel',
      title: '長音チェック（长音错误）',
      detail:
        entry.scriptType === 'katakana'
          ? '注意片假名长音符号「ー」的位置，不能漏写或用元音字母代替（键盘敲 - 即可输入「ー」）。'
          : '注意长音「う / い」的拼写位置，不要漏写或多写长音！',
    });
  }

  // 4. Dakuten / Handakuten check (清浊音/半浊音)
  const dakutenCell = diffCells.find(
    (cell) =>
      cell.status === 'wrong' &&
      cell.actual &&
      cell.expected &&
      cell.actual !== cell.expected &&
      stripDakuten(cell.actual) === stripDakuten(cell.expected)
  );
  if (dakutenCell) {
    diagnostics.push({
      kind: 'dakuten',
      title: '濁音・半濁音チェック（清浊音混淆）',
      detail: `注意「${dakutenCell.actual}」应改为「${dakutenCell.expected}」（检查两点浊音゛或圆圈半浊音゜）。`,
    });
  }

  // 5. Small Yoon / Sokuon size check (拗音/促音大小写)
  const smallYoonCell = diffCells.find(
    (cell) =>
      cell.status === 'wrong' &&
      cell.actual &&
      cell.expected &&
      SMALL_LARGE_PAIR[cell.actual] === cell.expected
  );
  if (smallYoonCell) {
    diagnostics.push({
      kind: 'small_yoon',
      title: '拗音・小文字チェック（大小假名错误）',
      detail: `「${smallYoonCell.actual}」和「${smallYoonCell.expected}」大小不同！拗音/促音要使用小假名。`,
    });
  }

  return {
    isCorrect: false,
    isAlternateRetry: false,
    normalizedInput,
    expected,
    diffCells,
    diagnostics,
  };
}

export interface LetterTile {
  id: string;
  char: string;
}

/**
 * Generates shuffled kana letterpress tiles combining exact word characters
 * and curated distractor characters.
 */
export function generateTilePool(entry: WordEntry): LetterTile[] {
  const combined = [...Array.from(entry.reading), ...entry.distractorChars];
  const tiles: LetterTile[] = combined.map((char, idx) => ({
    id: `${entry.id}-tile-${idx}-${char}`,
    char,
  }));

  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}
