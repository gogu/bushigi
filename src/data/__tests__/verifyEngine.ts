import {
  DAYS_OF_MONTH_DATA,
  HOURS_DATA,
  MONTHS_DATA,
  convertNumberToJapanese,
  getDynamicCounterReading,
  getMinuteReading,
} from '../japaneseNumbers';
import { evaluateJapaneseAnswer } from '../../engine/speechRecognition';

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${label}: expected "${expected}", got "${actual}"`);
  }
  console.log(`✅ [PASS] ${label}: ${actual}`);
}

console.log('=== Running Bushigi Japanese Number & Counter Engine Verification ===');

// 1. Number & Price Sound Changes
assertEqual(convertNumberToJapanese(300, true).hiragana, 'さんびゃくえん', '300円 Rendaku');
assertEqual(convertNumberToJapanese(600, true).hiragana, 'ろっぴゃくえん', '600円 Sokuon');
assertEqual(convertNumberToJapanese(800, true).hiragana, 'はっぴゃくえん', '800円 Sokuon');
assertEqual(convertNumberToJapanese(3000, true).hiragana, 'さんぜんえん', '3000円 Rendaku');
assertEqual(convertNumberToJapanese(8000, true).hiragana, 'はっせんえん', '8000円 Sokuon');
assertEqual(convertNumberToJapanese(3800, true).hiragana, 'さんぜんはっぴゃくえん', '3800円 Combo');
assertEqual(convertNumberToJapanese(10000, true).hiragana, 'いちまんえん', '10000円 Ichiman');
assertEqual(convertNumberToJapanese(4, true).hiragana, 'よえん', '4円 Special Yoen');

// 2. Dates & Times
assertEqual(DAYS_OF_MONTH_DATA.find((d) => d.key === '1')?.hiragana, 'ついたち', '1日 Tsuitachi');
assertEqual(DAYS_OF_MONTH_DATA.find((d) => d.key === '14')?.hiragana, 'じゅうよっか', '14日 Juuyokka');
assertEqual(DAYS_OF_MONTH_DATA.find((d) => d.key === '20')?.hiragana, 'はつか', '20日 Hatsuka');
assertEqual(DAYS_OF_MONTH_DATA.find((d) => d.key === '24')?.hiragana, 'にじゅうよっか', '24日 Nijuuyokka');
assertEqual(MONTHS_DATA.find((m) => m.key === '4')?.hiragana, 'しがつ', '4月 Shigatsu');
assertEqual(MONTHS_DATA.find((m) => m.key === '9')?.hiragana, 'くがつ', '9月 Kugatsu');
assertEqual(HOURS_DATA.find((h) => h.key === '4')?.hiragana, 'よじ', '4時 Yoji');
assertEqual(HOURS_DATA.find((h) => h.key === '9')?.hiragana, 'くじ', '9時 Kuji');
assertEqual(getMinuteReading(1).hiragana, 'いっぷん', '1分 Ippun');
assertEqual(getMinuteReading(3).hiragana, 'さんぷん', '3分 Sanpun');
assertEqual(getMinuteReading(6).hiragana, 'ろっぷん', '6分 Roppun');
assertEqual(getMinuteReading(10).hiragana, 'じゅっぷん', '10分 Juppun');

// 3. Counters
assertEqual(getDynamicCounterReading('nin', 1).hiragana, 'ひとり', '1人 Hitori');
assertEqual(getDynamicCounterReading('nin', 2).hiragana, 'ふたり', '2人 Futari');
assertEqual(getDynamicCounterReading('nin', 4).hiragana, 'よにん', '4人 Yonin');
assertEqual(getDynamicCounterReading('hon', 3).hiragana, 'さんぼん', '3本 Sanbon');
assertEqual(getDynamicCounterReading('hai', 3).hiragana, 'さんばい', '3杯 Sanbai');
assertEqual(getDynamicCounterReading('hiki', 6).hiragana, 'ろっぴき', '6匹 Roppiki');
assertEqual(getDynamicCounterReading('sai', 20).hiragana, 'はたち', '20歳 Hatachi');

// 4. Answer Evaluation (Romaji, Hiragana, Voice Kanji)
assertEqual(
  evaluateJapaneseAnswer('sanbai', ['さんばい'], ['3杯'], false).isCorrect,
  true,
  'Romaji auto-eval "sanbai" -> "さんばい"'
);
assertEqual(
  evaluateJapaneseAnswer('3杯です', ['さんばい'], ['3杯', '三杯'], true).isCorrect,
  true,
  'Voice ASR Kanji match "3杯です"'
);
assertEqual(
  evaluateJapaneseAnswer('さんぱい', ['さんばい'], ['3杯'], false).isCorrect,
  false,
  'Reject wrong rendaku "さんぱい"'
);

console.log('🎉 ALL ENGINE TESTS PASSED SUCCESSFULLY!');

