// @ts-ignore - Node built-in used by tsx test runner without @types/node in browser tsconfig
import fs from 'node:fs';
// @ts-ignore - Node built-in used by tsx test runner without @types/node in browser tsconfig
import path from 'node:path';
import * as wanakana from 'wanakana';
import { DECK_MINNA_03, WORD_DECKS, getWordById } from '../wordDecks';
import { checkJapaneseSpelling, generateTilePool } from '../../engine/spellingChecker';
import { buildOnlineTtsUrls } from '../../engine/audio';

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${label}: expected "${expected}", got "${actual}"`);
  }
  console.log(`✅ [PASS] ${label}: ${actual}`);
}

function assertTrue(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${label}: expected true, got false`);
  }
  console.log(`✅ [PASS] ${label}`);
}

console.log('=== Running Bushigi Stage 02 Word Spelling & Diagnostics Verification ===');

// 1. Deck integrity checks for all 20 flashcards from user's image
assertTrue(WORD_DECKS.length >= 1, 'At least 1 word deck registered');
assertEqual(DECK_MINNA_03.words.length, 20, 'Deck 01 has exact 20 words');

const hiraWords = DECK_MINNA_03.words.filter((w) => w.scriptType === 'hiragana');
const kataWords = DECK_MINNA_03.words.filter((w) => w.scriptType === 'katakana');
assertEqual(hiraWords.length, 14, 'Deck 01 has 14 hiragana words');
assertEqual(kataWords.length, 6, 'Deck 01 has 6 katakana words');

const uniqueIds = new Set(WORD_DECKS.flatMap((d) => d.words.map((w) => w.id)));
const totalWords = WORD_DECKS.reduce((acc, d) => acc + d.words.length, 0);
assertEqual(uniqueIds.size, totalWords, 'All word IDs across all decks are unique');

for (const deck of WORD_DECKS) {
  for (const w of deck.words) {
    if (w.scriptType === 'hiragana') {
      assertTrue(wanakana.isHiragana(w.reading), `${w.display} reading "${w.reading}" is pure hiragana`);
    } else {
      assertTrue(wanakana.isKatakana(w.reading), `${w.display} reading "${w.reading}" is pure katakana`);
    }
    const tiles = generateTilePool(w);
    assertEqual(
      tiles.length,
      Array.from(w.reading).length + w.distractorChars.length,
      `Tile pool count matches for ${w.display}`
    );
    assertTrue(
      w.imageUrl.startsWith('./images/words/') && w.imageUrl.endsWith('.png'),
      `${w.display} imageUrl "${w.imageUrl}" uses relative ./images/words/*.png path`
    );
    // @ts-ignore - Node global process used in tsx test runner
    const imgDiskPath = path.resolve(process.cwd(), 'public', w.imageUrl.replace(/^\.\//, ''));
    assertTrue(fs.existsSync(imgDiskPath), `Image file exists on disk for ${w.id}`);
    assertTrue(fs.statSync(imgDiskPath).size > 2048, `Image file > 2KB for ${w.id}`);
  }
}

// 2. Spelling Checker Accuracy & Romaji Conversion
const wShokudou = getWordById('w-shokudou')!;
const wElevator = getWordById('w-elevator')!;
const wToire = getWordById('w-toire')!;
const wKaigishitsu = getWordById('w-kaigishitsu')!;
const wVending = getWordById('w-jidouhanbaiki')!;
const wUchi = getWordById('w-uchi')!;
const wJimusho = getWordById('w-jimusho')!;
const wRobii = getWordById('w-robii')!;

assertEqual(checkJapaneseSpelling('shokudou', wShokudou).isCorrect, true, 'Romaji "shokudou" -> しょくどう');
assertEqual(checkJapaneseSpelling('erebe-ta-', wElevator).isCorrect, true, 'Romaji "erebe-ta-" -> エレベーター');
assertEqual(checkJapaneseSpelling('jidouhanbaiki', wVending).isCorrect, true, 'Romaji "jidouhanbaiki" -> じどうはんばいき');
assertEqual(checkJapaneseSpelling('ロビー', wRobii).isCorrect, true, 'Exact Katakana "ロビー"');
assertEqual(checkJapaneseSpelling('うち', wUchi).isCorrect, true, 'Exact Hiragana "うち"');

// 3. Alternate reading friendly retry ("いえ" for 家)
const uchiAlt = checkJapaneseSpelling('いえ', wUchi);
assertEqual(uchiAlt.isCorrect, false, '家 "いえ" does not pass as "うち"');
assertEqual(uchiAlt.isAlternateRetry, true, '家 "いえ" triggers alternate retry without penalty');

// 4. Diagnostic 1: Long vowel missing / extra
const diagLongMissingHira = checkJapaneseSpelling('しょくど', wShokudou);
assertEqual(diagLongMissingHira.isCorrect, false, 'しょくど rejected');
assertTrue(
  diagLongMissingHira.diagnostics.some((d) => d.kind === 'long_vowel'),
  'しょくど detects long_vowel missing う'
);

const diagLongMissingKata = checkJapaneseSpelling('エレベタ', wElevator);
assertTrue(
  diagLongMissingKata.diagnostics.some((d) => d.kind === 'long_vowel'),
  'エレベタ detects long_vowel missing ー'
);

const diagLongExtra = checkJapaneseSpelling('じむしょう', wJimusho);
assertTrue(
  diagLongExtra.diagnostics.some((d) => d.kind === 'long_vowel'),
  'じむしょう detects extra long vowel う'
);

// 5. Diagnostic 2: Dakuten / Handakuten confusion
const diagDakuten1 = checkJapaneseSpelling('かいきしつ', wKaigishitsu);
assertTrue(
  diagDakuten1.diagnostics.some((d) => d.kind === 'dakuten'),
  'かいきしつ detects dakuten error (き vs ぎ)'
);

const diagDakuten2 = checkJapaneseSpelling('じどうはんぱいき', wVending);
assertTrue(
  diagDakuten2.diagnostics.some((d) => d.kind === 'dakuten'),
  'じどうはんぱいき detects handakuten vs dakuten error (ぱ vs ば)'
);

// 6. Diagnostic 3: Small Yoon size error
const diagSmallYoon = checkJapaneseSpelling('しよくどう', wShokudou);
assertTrue(
  diagSmallYoon.diagnostics.some((d) => d.kind === 'small_yoon'),
  'しよくどう detects small_yoon error (よ vs ょ)'
);

// 7. Diagnostic 4: Script mismatch (hiragana for katakana word)
const diagScript = checkJapaneseSpelling('といれ', wToire);
assertTrue(
  diagScript.diagnostics.some((d) => d.kind === 'script_mismatch'),
  'といれ detects script_mismatch for トイレ'
);

// 8. Diagnostic 5: Confusable word (escalator for elevator)
const diagConfusable = checkJapaneseSpelling('エスカレーター', wElevator);
assertTrue(
  diagConfusable.diagnostics.some((d) => d.kind === 'confusable_word'),
  'エスカレーター detects confusable_word for エレベーター'
);

// 9. Japanese TTS URL routing (word vs example sentence)
const wordUrls = buildOnlineTtsUrls('しょくどう', 0.95);
assertTrue(wordUrls[0].includes('dict.youdao.com/dictvoice'), 'Short word routes Youdao TTS first');
assertTrue(wordUrls[1].includes('fanyi.baidu.com/gettts'), 'Short word includes Baidu TTS fallback');

const sentenceUrls = buildOnlineTtsUrls('昼ご飯は会社の食堂で食べます。', 0.95);
assertTrue(sentenceUrls[0].includes('fanyi.baidu.com/gettts'), 'Japanese sentence routes Baidu TTS first');
assertTrue(sentenceUrls[1].includes('dict.youdao.com/dictvoice'), 'Japanese sentence includes Youdao fallback');
assertTrue(!decodeURIComponent(sentenceUrls[1]).includes('。'), 'Youdao sentence fallback strips Japanese period "。"');
assertTrue(sentenceUrls[2].includes('translate.googleapis.com'), 'Japanese sentence includes Google TTS fallback');

console.log('🎉 ALL STAGE 02 SPELLING & DIAGNOSTICS TESTS PASSED!');
