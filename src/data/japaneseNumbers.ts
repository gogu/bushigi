import * as wanakana from 'wanakana';

export type SoundChangeType = 'normal' | 'sokuon' | 'rendaku' | 'handakuon' | 'special';

export interface ReadingSegment {
  label: string;
  kanji: string;
  hiragana: string;
  changeType: SoundChangeType;
  note?: string;
}

export interface NumberReadingResult {
  num: number;
  includeYen: boolean;
  formatted: string;
  kanji: string;
  hiragana: string;
  romaji: string;
  alternativeHiragana: string[];
  segments: ReadingSegment[];
  changeNotes: string[];
}

export const SOUND_CHANGE_META: Record<
  SoundChangeType,
  { label: string; shortLabel: string; badgeClass: string; textClass: string; desc: string }
> = {
  normal: {
    label: '標準読み (常规读音)',
    shortLabel: '標準',
    badgeClass: 'bg-washi-dark text-sumi border-washi-border',
    textClass: 'text-sumi',
    desc: '基礎数字＋単位のそのままの組み合わせです。',
  },
  sokuon: {
    label: '⚡ 促音便 (小っ+清/半濁音)',
    shortLabel: '促音 っ',
    badgeClass: 'bg-shuiro text-white border-shuiro-dark',
    textClass: 'text-shuiro font-extrabold',
    desc: '1・6・8・10 の後ろで「っ」に詰まり、は行は「ぱ行」に変わります。',
  },
  rendaku: {
    label: '🔔 連濁 (浊音化 ば/ざ/が行)',
    shortLabel: '連濁 ゛',
    badgeClass: 'bg-kohaku text-sumi border-kohaku-dark',
    textClass: 'text-kohaku-dark font-extrabold',
    desc: '主に「3 (さん)」や「何 (なん)」（撥音「ん」の後）で濁音に変化します。',
  },
  handakuon: {
    label: '🫧 半濁音化 (ん+ぱ行)',
    shortLabel: '半濁音 ゜',
    badgeClass: 'bg-aiiro text-white border-aiiro-dark',
    textClass: 'text-aiiro font-extrabold',
    desc: '「3分(さんぷん)」「4分(よんぷん)」など、「ん」の直後で「ぷ」に変わる現象です。',
  },
  special: {
    label: '🌸 特殊訓読み・例外',
    shortLabel: '特殊訓読',
    badgeClass: 'bg-matcha text-white border-matcha-dark',
    textClass: 'text-matcha-dark font-extrabold',
    desc: '固有の和語（訓読み）や「4時(よじ)」「9月(くがつ)」など特別な読み方をします。',
  },
};

const DIGIT_KANJI = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const DIGIT_HIRA = ['ゼロ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

// Convert a 4-digit chunk (1 ~ 9999) into ReadingSegments
function convertFourDigitChunk(chunk: number): ReadingSegment[] {
  const segs: ReadingSegment[] = [];
  const thousands = Math.floor(chunk / 1000);
  const hundreds = Math.floor((chunk % 1000) / 100);
  const tens = Math.floor((chunk % 100) / 10);
  const ones = chunk % 10;

  if (thousands > 0) {
    if (thousands === 1) {
      segs.push({ label: '千の位', kanji: '千', hiragana: 'せん', changeType: 'normal' });
    } else if (thousands === 3) {
      segs.push({
        label: '千の位',
        kanji: '三千',
        hiragana: 'さんぜん',
        changeType: 'rendaku',
        note: '3000 は「さんせん」ではなく連濁して「さんぜん」',
      });
    } else if (thousands === 8) {
      segs.push({
        label: '千の位',
        kanji: '八千',
        hiragana: 'はっせん',
        changeType: 'sokuon',
        note: '8000 は促音便で「はっせん」',
      });
    } else {
      segs.push({
        label: '千の位',
        kanji: `${DIGIT_KANJI[thousands]}千`,
        hiragana: `${DIGIT_HIRA[thousands]}せん`,
        changeType: 'normal',
      });
    }
  }

  if (hundreds > 0) {
    if (hundreds === 1) {
      segs.push({ label: '百の位', kanji: '百', hiragana: 'ひゃく', changeType: 'normal' });
    } else if (hundreds === 3) {
      segs.push({
        label: '百の位',
        kanji: '三百',
        hiragana: 'さんびゃく',
        changeType: 'rendaku',
        note: '300 は連濁して「さんびゃく」',
      });
    } else if (hundreds === 6) {
      segs.push({
        label: '百の位',
        kanji: '六百',
        hiragana: 'ろっぴゃく',
        changeType: 'sokuon',
        note: '600 は促音＋半濁音で「ろっぴゃく」',
      });
    } else if (hundreds === 8) {
      segs.push({
        label: '百の位',
        kanji: '八百',
        hiragana: 'はっぴゃく',
        changeType: 'sokuon',
        note: '800 は促音＋半濁音で「はっぴゃく」',
      });
    } else {
      segs.push({
        label: '百の位',
        kanji: `${DIGIT_KANJI[hundreds]}百`,
        hiragana: `${DIGIT_HIRA[hundreds]}ひゃく`,
        changeType: 'normal',
      });
    }
  }

  if (tens > 0) {
    if (tens === 1) {
      segs.push({ label: '十の位', kanji: '十', hiragana: 'じゅう', changeType: 'normal' });
    } else {
      segs.push({
        label: '十の位',
        kanji: `${DIGIT_KANJI[tens]}十`,
        hiragana: `${DIGIT_HIRA[tens]}じゅう`,
        changeType: 'normal',
      });
    }
  }

  if (ones > 0) {
    segs.push({
      label: '一の位',
      kanji: DIGIT_KANJI[ones],
      hiragana: DIGIT_HIRA[ones],
      changeType: 'normal',
    });
  }

  return segs;
}

export function convertNumberToJapanese(rawNum: number, includeYen: boolean = false): NumberReadingResult {
  const num = Math.max(0, Math.min(999999999999, Math.floor(rawNum)));
  const segments: ReadingSegment[] = [];
  const changeNotes: string[] = [];

  if (num === 0) {
    segments.push({
      label: 'ゼロ',
      kanji: '零',
      hiragana: includeYen ? 'れい' : 'ゼロ',
      changeType: 'normal',
    });
  } else {
    const oku = Math.floor(num / 100000000);
    const man = Math.floor((num % 100000000) / 10000);
    const rest = num % 10000;

    if (oku > 0) {
      const okuSegs = convertFourDigitChunk(oku);
      segments.push(...okuSegs);
      segments.push({ label: '億の単位', kanji: '億', hiragana: 'おく', changeType: 'normal' });
    }

    if (man > 0) {
      const manSegs = convertFourDigitChunk(man);
      segments.push(...manSegs);
      segments.push({ label: '万の単位', kanji: '万', hiragana: 'まん', changeType: 'normal' });
    }

    if (rest > 0) {
      const restSegs = convertFourDigitChunk(rest);
      // Special check: if includeYen is true and last digit is 4 -> "よえん" (though よんえん is also heard, よえん is standard)
      if (includeYen && rest % 10 === 4 && restSegs.length > 0) {
        const lastIdx = restSegs.length - 1;
        restSegs[lastIdx] = {
          label: '一の位',
          kanji: '四',
          hiragana: 'よ',
          changeType: 'special',
          note: '「4円」は「よんえん」ではなく「よえん」と読むのが標準です',
        };
      }
      segments.push(...restSegs);
    }
  }

  if (includeYen) {
    segments.push({
      label: '通貨単位',
      kanji: '円',
      hiragana: 'えん',
      changeType: 'normal',
    });
  }

  segments.forEach((s) => {
    if (s.note && !changeNotes.includes(s.note)) {
      changeNotes.push(s.note);
    }
  });

  const kanji = segments.map((s) => s.kanji).join('');
  const hiragana = segments.map((s) => s.hiragana).join('');
  const romaji = wanakana.toRomaji(hiragana);

  const alternativeHiragana = [hiragana];
  if (includeYen && num % 10 === 4) {
    // Also accept よんえん in conversational quizzes
    alternativeHiragana.push(hiragana.replace(/よえん$/, 'よんえん'));
  }

  return {
    num,
    includeYen,
    formatted: `${num.toLocaleString('ja-JP')}${includeYen ? '円' : ''}`,
    kanji,
    hiragana,
    romaji,
    alternativeHiragana,
    segments,
    changeNotes,
  };
}

// ==========================================
// 2. Date & Time Engine (月・日・曜日・時・分)
// ==========================================

export interface DateItemReading {
  key: string;
  display: string;
  kanji: string;
  hiragana: string;
  altHiragana?: string[];
  romaji: string;
  changeType: SoundChangeType;
  tip: string;
}

export const MONTHS_DATA: DateItemReading[] = [
  { key: '1', display: '1月', kanji: '一月', hiragana: 'いちがつ', romaji: 'ichigatsu', changeType: 'normal', tip: '1年の始まり（睦月）' },
  { key: '2', display: '2月', kanji: '二月', hiragana: 'にがつ', romaji: 'nigatsu', changeType: 'normal', tip: 'そのまま「に＋がつ」' },
  { key: '3', display: '3月', kanji: '三月', hiragana: 'さんがつ', romaji: 'sangatsu', changeType: 'normal', tip: 'そのまま「さん＋がつ」' },
  { key: '4', display: '4月', kanji: '四月', hiragana: 'しがつ', romaji: 'shigatsu', changeType: 'special', tip: '⚠️「よんがつ」はNG！必ず「しがつ」と読みます' },
  { key: '5', display: '5月', kanji: '五月', hiragana: 'ごがつ', romaji: 'gogatsu', changeType: 'normal', tip: 'そのまま「ご＋がつ」' },
  { key: '6', display: '6月', kanji: '六月', hiragana: 'ろくがつ', romaji: 'rokugatsu', changeType: 'normal', tip: 'そのまま「ろく＋がつ」' },
  { key: '7', display: '7月', kanji: '七月', hiragana: 'しちがつ', altHiragana: ['なながつ'], romaji: 'shichigatsu', changeType: 'special', tip: '⚠️「しちがつ」が正式（聞き返しでなながつと言う場合もあり）' },
  { key: '8', display: '8月', kanji: '八月', hiragana: 'はちがつ', romaji: 'hachigatsu', changeType: 'normal', tip: 'そのまま「はち＋がつ」' },
  { key: '9', display: '9月', kanji: '九月', hiragana: 'くがつ', romaji: 'kugatsu', changeType: 'special', tip: '⚠️「きゅうがつ」はNG！必ず「くがつ」と読みます' },
  { key: '10', display: '10月', kanji: '十月', hiragana: 'じゅうがつ', romaji: 'juugatsu', changeType: 'normal', tip: 'そのまま「じゅう＋がつ」' },
  { key: '11', display: '11月', kanji: '十一月', hiragana: 'じゅういちがつ', romaji: 'juuichigatsu', changeType: 'normal', tip: '11＋月' },
  { key: '12', display: '12月', kanji: '十二月', hiragana: 'じゅうにがつ', romaji: 'juunigatsu', changeType: 'normal', tip: '12＋月' },
  { key: '?', display: '何月', kanji: '何月', hiragana: 'なんがつ', romaji: 'nangatsu', changeType: 'normal', tip: '疑問詞「なん＋がつ」' },
];

export const DAYS_OF_MONTH_DATA: DateItemReading[] = [
  { key: '1', display: '1日', kanji: '一日', hiragana: 'ついたち', romaji: 'tsuitachi', changeType: 'special', tip: '🌸「月立ち(つきたち)」が語源。一日間(いちにち)と混同注意！' },
  { key: '2', display: '2日', kanji: '二日', hiragana: 'ふつか', romaji: 'futsuka', changeType: 'special', tip: '🌸 和語訓読み：ふつ＋か' },
  { key: '3', display: '3日', kanji: '三日', hiragana: 'みっか', romaji: 'mikka', changeType: 'special', tip: '🌸 促音が入る訓読み「みっか」' },
  { key: '4', display: '4日', kanji: '四日', hiragana: 'よっか', romaji: 'yokka', changeType: 'special', tip: '🌸 促音が入る訓読み「よっか」（みっかと区別！）' },
  { key: '5', display: '5日', kanji: '五日', hiragana: 'いつか', romaji: 'itsuka', changeType: 'special', tip: '🌸 和語訓読み：いつ＋か' },
  { key: '6', display: '6日', kanji: '六日', hiragana: 'むいか', romaji: 'muika', changeType: 'special', tip: '🌸 和語訓読み：むい＋か' },
  { key: '7', display: '7日', kanji: '七日', hiragana: 'なのか', romaji: 'nanoka', changeType: 'special', tip: '🌸 和語訓読み：なの＋か' },
  { key: '8', display: '8日', kanji: '八日', hiragana: 'ようか', romaji: 'youka', changeType: 'special', tip: '🌸 長音「ようか」（4日＝よっか と要注意！）' },
  { key: '9', display: '9日', kanji: '九日', hiragana: 'ここのか', romaji: 'kokonoka', changeType: 'special', tip: '🌸 和語訓読み：ここの＋か' },
  { key: '10', display: '10日', kanji: '十日', hiragana: 'とおか', romaji: 'tooka', changeType: 'special', tip: '🌸 和語訓読み：とお＋か' },
  { key: '11', display: '11日', kanji: '十一日', hiragana: 'じゅういちにち', romaji: 'juuichinichi', changeType: 'normal', tip: '11日以降は基本的に音読み＋にち' },
  { key: '12', display: '12日', kanji: '十二日', hiragana: 'じゅうににち', romaji: 'juuninichi', changeType: 'normal', tip: 'じゅうに＋にち' },
  { key: '13', display: '13日', kanji: '十三日', hiragana: 'じゅうさんにち', romaji: 'juusannichi', changeType: 'normal', tip: 'じゅうさん＋にち' },
  { key: '14', display: '14日', kanji: '十四日', hiragana: 'じゅうよっか', romaji: 'juuyokka', changeType: 'special', tip: '⚠️ 14日は「じゅう＋よっか」に変化！' },
  { key: '15', display: '15日', kanji: '十五日', hiragana: 'じゅうごにち', romaji: 'juugonichi', changeType: 'normal', tip: 'じゅうご＋にち' },
  { key: '16', display: '16日', kanji: '十六日', hiragana: 'じゅうろくにち', romaji: 'juurokunichi', changeType: 'normal', tip: 'じゅうろく＋にち' },
  { key: '17', display: '17日', kanji: '十七日', hiragana: 'じゅうしちにち', altHiragana: ['じゅうななにち'], romaji: 'juushichinichi', changeType: 'special', tip: '「じゅうしちにち」（じゅうななにち も可）' },
  { key: '18', display: '18日', kanji: '十八日', hiragana: 'じゅうはちにち', romaji: 'juuhachinichi', changeType: 'normal', tip: 'じゅうはち＋にち' },
  { key: '19', display: '19日', kanji: '十九日', hiragana: 'じゅうくにち', altHiragana: ['じゅうきゅうにち'], romaji: 'juukunichi', changeType: 'special', tip: '⚠️ 19日は伝統的に「じゅうくにち」' },
  { key: '20', display: '20日', kanji: '二十日', hiragana: 'はつか', romaji: 'hatsuka', changeType: 'special', tip: '🌸 超重要特殊読み！20日は「はつか」' },
  { key: '21', display: '21日', kanji: '二十一日', hiragana: 'にじゅういちにち', romaji: 'nijuuichinichi', changeType: 'normal', tip: 'にじゅういち＋にち' },
  { key: '22', display: '22日', kanji: '二十二日', hiragana: 'にじゅうににち', romaji: 'nijuuninichi', changeType: 'normal', tip: 'にじゅうに＋にち' },
  { key: '23', display: '23日', kanji: '二十三日', hiragana: 'にじゅうさんにち', romaji: 'nijuusannichi', changeType: 'normal', tip: 'にじゅうさん＋にち' },
  { key: '24', display: '24日', kanji: '二十四日', hiragana: 'にじゅうよっか', romaji: 'nijuuyokka', changeType: 'special', tip: '⚠️ 24日は「にじゅう＋よっか」に変化！' },
  { key: '25', display: '25日', kanji: '二十五日', hiragana: 'にじゅうごにち', romaji: 'nijuugonichi', changeType: 'normal', tip: 'にじゅうご＋にち' },
  { key: '26', display: '26日', kanji: '二十六日', hiragana: 'にじゅうろくにち', romaji: 'nijuurokunichi', changeType: 'normal', tip: 'にじゅうろく＋にち' },
  { key: '27', display: '27日', kanji: '二十七日', hiragana: 'にじゅうしちにち', altHiragana: ['にじゅうななにち'], romaji: 'nijuushichinichi', changeType: 'special', tip: '「にじゅうしちにち」（にじゅうななにち も可）' },
  { key: '28', display: '28日', kanji: '二十八日', hiragana: 'にじゅうはちにち', romaji: 'nijuuhachinichi', changeType: 'normal', tip: 'にじゅうはち＋にち' },
  { key: '29', display: '29日', kanji: '二十九日', hiragana: 'にじゅうくにち', altHiragana: ['にじゅうきゅうにち'], romaji: 'nijuukunichi', changeType: 'special', tip: '⚠️ 29日は「にじゅうくにち」' },
  { key: '30', display: '30日', kanji: '三十日', hiragana: 'さんじゅうにち', romaji: 'sanjuunichi', changeType: 'normal', tip: 'さんじゅう＋にち' },
  { key: '31', display: '31日', kanji: '三十一日', hiragana: 'さんじゅういちにち', romaji: 'sanjuuichinichi', changeType: 'normal', tip: 'さんじゅういち＋にち' },
  { key: '?', display: '何日', kanji: '何日', hiragana: 'なんにち', romaji: 'nannichi', changeType: 'normal', tip: '疑問詞「なん＋にち」' },
];

export const WEEKDAYS_DATA: DateItemReading[] = [
  { key: 'mon', display: '月曜日', kanji: '月曜日', hiragana: 'げつようび', romaji: 'getsuyoubi', changeType: 'normal', tip: '🌙 月 (げつ) ＋ ようび' },
  { key: 'tue', display: '火曜日', kanji: '火曜日', hiragana: 'かようび', romaji: 'kayoubi', changeType: 'normal', tip: '🔥 火 (か) ＋ ようび' },
  { key: 'wed', display: '水曜日', kanji: '水曜日', hiragana: 'すいようび', romaji: 'suiyoubi', changeType: 'normal', tip: '💧 水 (すい) ＋ ようび' },
  { key: 'thu', display: '木曜日', kanji: '木曜日', hiragana: 'もくようび', romaji: 'mokuyoubi', changeType: 'normal', tip: '🌲 木 (もく) ＋ ようび' },
  { key: 'fri', display: '金曜日', kanji: '金曜日', hiragana: 'きんようび', romaji: 'kinyoubi', changeType: 'normal', tip: '✨ 金 (きん) ＋ ようび' },
  { key: 'sat', display: '土曜日', kanji: '土曜日', hiragana: 'どようび', romaji: 'doyoubi', changeType: 'normal', tip: '⛰️ 土 (ど) ＋ ようび' },
  { key: 'sun', display: '日曜日', kanji: '日曜日', hiragana: 'にちようび', romaji: 'nichiyoubi', changeType: 'normal', tip: '☀️ 日 (にち) ＋ ようび' },
  { key: '?', display: '何曜日', kanji: '何曜日', hiragana: 'なんようび', romaji: 'nanyoubi', changeType: 'normal', tip: '❓ 何 (なん) ＋ ようび' },
];

export const HOURS_DATA: DateItemReading[] = [
  { key: '1', display: '1時', kanji: '一時', hiragana: 'いちじ', romaji: 'ichiji', changeType: 'normal', tip: 'いち＋じ' },
  { key: '2', display: '2時', kanji: '二時', hiragana: 'にじ', romaji: 'niji', changeType: 'normal', tip: 'に＋じ' },
  { key: '3', display: '3時', kanji: '三時', hiragana: 'さんじ', romaji: 'sanji', changeType: 'normal', tip: 'さん＋じ' },
  { key: '4', display: '4時', kanji: '四時', hiragana: 'よじ', romaji: 'yoji', changeType: 'special', tip: '⚠️「よんじ」はNG！必ず「よじ」と読みます' },
  { key: '5', display: '5時', kanji: '五時', hiragana: 'ごじ', romaji: 'goji', changeType: 'normal', tip: 'ご＋じ' },
  { key: '6', display: '6時', kanji: '六時', hiragana: 'ろくじ', romaji: 'rokuji', changeType: 'normal', tip: 'ろく＋じ' },
  { key: '7', display: '7時', kanji: '七時', hiragana: 'しちじ', altHiragana: ['ななじ'], romaji: 'shichiji', changeType: 'special', tip: '⚠️「しちじ」が基本（アナウンス等でななじも使用）' },
  { key: '8', display: '8時', kanji: '八時', hiragana: 'はちじ', romaji: 'hachiji', changeType: 'normal', tip: 'はち＋じ' },
  { key: '9', display: '9時', kanji: '九時', hiragana: 'くじ', romaji: 'kuji', changeType: 'special', tip: '⚠️「きゅうじ」はNG！必ず「くじ」と読みます' },
  { key: '10', display: '10時', kanji: '十時', hiragana: 'じゅうじ', romaji: 'juuji', changeType: 'normal', tip: 'じゅう＋じ' },
  { key: '11', display: '11時', kanji: '十一時', hiragana: 'じゅういちじ', romaji: 'juuichiji', changeType: 'normal', tip: 'じゅういち＋じ' },
  { key: '12', display: '12時', kanji: '十二時', hiragana: 'じゅうにじ', romaji: 'juuniji', changeType: 'normal', tip: 'じゅうに＋じ' },
  { key: '?', display: '何時', kanji: '何時', hiragana: 'なんじ', romaji: 'nanji', changeType: 'normal', tip: '疑問詞「なん＋じ」' },
];

export const MINUTES_ONE_TO_TEN: DateItemReading[] = [
  { key: '1', display: '1分', kanji: '一分', hiragana: 'いっぷん', romaji: 'ippun', changeType: 'sokuon', tip: '⚡ 1＋ふん → 促音便「いっぷん」' },
  { key: '2', display: '2分', kanji: '二分', hiragana: 'にふん', romaji: 'nifun', changeType: 'normal', tip: 'そのまま「にふん」' },
  { key: '3', display: '3分', kanji: '三分', hiragana: 'さんぷん', romaji: 'sanpun', changeType: 'handakuon', tip: '🫧 ん＋ふん → 半濁音「さんぷん」' },
  { key: '4', display: '4分', kanji: '四分', hiragana: 'よんぷん', romaji: 'yonpun', changeType: 'handakuon', tip: '🫧 ん＋ふん → 半濁音「よんぷん」' },
  { key: '5', display: '5分', kanji: '五分', hiragana: 'ごふん', romaji: 'gofun', changeType: 'normal', tip: 'そのまま「ごふん」' },
  { key: '6', display: '6分', kanji: '六分', hiragana: 'ろっぷん', romaji: 'roppun', changeType: 'sokuon', tip: '⚡ 6＋ふん → 促音便「ろっぷん」' },
  { key: '7', display: '7分', kanji: '七分', hiragana: 'ななふん', altHiragana: ['しちふん'], romaji: 'nanafun', changeType: 'normal', tip: 'そのまま「ななふん」' },
  { key: '8', display: '8分', kanji: '八分', hiragana: 'はっぷん', altHiragana: ['はちふん'], romaji: 'happun', changeType: 'sokuon', tip: '⚡ 8＋ふん →「はっぷん」（はちふん も可）' },
  { key: '9', display: '9分', kanji: '九分', hiragana: 'きゅうふん', romaji: 'kyuufun', changeType: 'normal', tip: 'そのまま「きゅうふん」' },
  { key: '10', display: '10分', kanji: '十分', hiragana: 'じゅっぷん', altHiragana: ['じっぷん'], romaji: 'juppun', changeType: 'sokuon', tip: '⚡ 10＋ふん → 促音便「じゅっぷん（じっぷん）」' },
  { key: '30', display: '30分', kanji: '三十分', hiragana: 'さんじゅっぷん', altHiragana: ['さんじっぷん', 'はん'], romaji: 'sanjuppun', changeType: 'sokuon', tip: '⚡「さんじゅっぷん」または「半 (はん)」' },
  { key: '?', display: '何分', kanji: '何分', hiragana: 'なんぷん', romaji: 'nanpun', changeType: 'handakuon', tip: '🫧 何(なん)＋ふん → 半濁音「なんぷん」' },
];

export function getMinuteReading(minute: number): DateItemReading {
  if (minute <= 0) {
    return { key: '0', display: '0分', kanji: '零分', hiragana: 'れいふん', romaji: 'reifun', changeType: 'normal', tip: 'ちょうど（零分）' };
  }
  const tens = Math.floor(minute / 10);
  const ones = minute % 10;
  if (ones === 0) {
    const prefixKanji = tens === 1 ? '十' : `${DIGIT_KANJI[tens]}十`;
    const prefixHira = tens === 1 ? '' : DIGIT_HIRA[tens];
    const hira = `${prefixHira}じゅっぷん`;
    const alt = [`${prefixHira}じっぷん`];
    if (minute === 30) alt.push('はん');
    return {
      key: String(minute),
      display: `${minute}分`,
      kanji: `${prefixKanji}分`,
      hiragana: hira,
      altHiragana: alt,
      romaji: wanakana.toRomaji(hira),
      changeType: 'sokuon',
      tip: `${minute}分は促音便で「${hira}」${minute === 30 ? '（時刻と一緒なら「〜時半(はん)」も定番！）' : ''}`,
    };
  }
  const onesEntry = MINUTES_ONE_TO_TEN.find((m) => m.key === String(ones))!;
  if (tens === 0) return onesEntry;

  const prefixKanji = tens === 1 ? '十' : `${DIGIT_KANJI[tens]}十`;
  const prefixHira = tens === 1 ? 'じゅう' : `${DIGIT_HIRA[tens]}じゅう`;
  const hira = `${prefixHira}${onesEntry.hiragana}`;
  return {
    key: String(minute),
    display: `${minute}分`,
    kanji: `${prefixKanji}${onesEntry.kanji}`,
    hiragana: hira,
    altHiragana: onesEntry.altHiragana ? onesEntry.altHiragana.map((a) => `${prefixHira}${a}`) : undefined,
    romaji: wanakana.toRomaji(hira),
    changeType: onesEntry.changeType,
    tip: onesEntry.tip,
  };
}

// ==========================================
// 3. 10 Essential Counters Engine (助数詞)
// ==========================================

export interface CounterCell {
  countKey: string; // '1'..'10' or '?'
  display: string;
  kanji: string;
  hiragana: string;
  altHiragana?: string[];
  romaji: string;
  changeType: SoundChangeType;
  note: string;
}

export interface CounterDefinition {
  id: string;
  symbol: string;
  name: string;
  kanaName: string;
  emoji: string;
  categoryDesc: string;
  examples: string;
  ruleSummary: string;
  items: CounterCell[];
}

function buildCounterCells(
  symbol: string,
  rawList: Array<{
    key: string;
    kanji: string;
    hira: string;
    alt?: string[];
    type: SoundChangeType;
    note: string;
  }>
): CounterCell[] {
  return rawList.map((item) => ({
    countKey: item.key,
    display: item.key === '?' ? `何${symbol}` : `${item.key}${symbol}`,
    kanji: item.kanji,
    hiragana: item.hira,
    altHiragana: item.alt,
    romaji: wanakana.toRomaji(item.hira),
    changeType: item.type,
    note: item.note,
  }));
}

export const COUNTERS_DATA: CounterDefinition[] = [
  {
    id: 'tsu',
    symbol: 'つ',
    name: '〜つ (通用个数)',
    kanaName: 'ひとつ・ふたつ…',
    emoji: '🍎',
    categoryDesc: '万能の和語数え方（1〜10まで）',
    examples: 'りんご、みかん、注文の品、年齢（1〜9歳）、抽象的な事柄',
    ruleSummary: '日本古来の和語（訓読み）。10は「つ」が付かず「とお」、疑問詞は「いくつ」になります！',
    items: buildCounterCells('つ', [
      { key: '1', kanji: '一つ', hira: 'ひとつ', type: 'special', note: '和語訓読み「ひとつ」' },
      { key: '2', kanji: '二つ', hira: 'ふたつ', type: 'special', note: '和語訓読み「ふたつ」' },
      { key: '3', kanji: '三つ', hira: 'みっつ', type: 'sokuon', note: '促音が入る「みっつ」' },
      { key: '4', kanji: '四つ', hira: 'よっつ', type: 'sokuon', note: '促音が入る「よっつ」' },
      { key: '5', kanji: '五つ', hira: 'いつつ', type: 'special', note: '和語訓読み「いつつ」' },
      { key: '6', kanji: '六つ', hira: 'むっつ', type: 'sokuon', note: '促音が入る「むっつ」' },
      { key: '7', kanji: '七つ', hira: 'ななつ', type: 'special', note: '和語訓読み「ななつ」' },
      { key: '8', kanji: '八つ', hira: 'やっつ', type: 'sokuon', note: '促音が入る「やっつ」' },
      { key: '9', kanji: '九つ', hira: 'ここのつ', type: 'special', note: '和語訓読み「ここのつ」' },
      { key: '10', kanji: '十', hira: 'とお', type: 'special', note: '⚠️「つ」は付かず「とお」' },
      { key: '?', kanji: '幾つ', hira: 'いくつ', type: 'special', note: '⚠️「なんつ」ではなく「いくつ」' },
    ]),
  },
  {
    id: 'nin',
    symbol: '人',
    name: '〜人 (人数)',
    kanaName: 'にん / り',
    emoji: '🧑‍🤝‍🧑',
    categoryDesc: '人の数を数える助数詞',
    examples: 'お客さん、家族、予約人数、学生',
    ruleSummary: '1人(ひとり)・2人(ふたり)・4人(よにん)の3つが超頻出の特殊変化です！',
    items: buildCounterCells('人', [
      { key: '1', kanji: '一人', hira: 'ひとり', type: 'special', note: '🌸「いちにん」ではなく「ひとり」' },
      { key: '2', kanji: '二人', hira: 'ふたり', type: 'special', note: '🌸「ににん」ではなく「ふたり」' },
      { key: '3', kanji: '三人', hira: 'さんにん', type: 'normal', note: '3人からは音読み「にん」' },
      { key: '4', kanji: '四人', hira: 'よにん', type: 'special', note: '⚠️「よんにん」ではなく「よにん」' },
      { key: '5', kanji: '五人', hira: 'ごにん', type: 'normal', note: 'ご＋にん' },
      { key: '6', kanji: '六人', hira: 'ろくにん', type: 'normal', note: 'ろく＋にん' },
      { key: '7', kanji: '七人', hira: 'しちにん', alt: ['ななにん'], type: 'special', note: '「しちにん」または「ななにん」' },
      { key: '8', kanji: '八人', hira: 'はちにん', type: 'normal', note: 'はち＋にん' },
      { key: '9', kanji: '九人', hira: 'きゅうにん', alt: ['くにん'], type: 'normal', note: 'きゅうにん（くにん も可）' },
      { key: '10', kanji: '十人', hira: 'じゅうにん', type: 'normal', note: 'じゅう＋にん' },
      { key: '?', kanji: '何人', hira: 'なんにん', type: 'normal', note: 'なん＋にん' },
    ]),
  },
  {
    id: 'hon',
    symbol: '本',
    name: '〜本 (细长物品)',
    kanaName: 'ほん / ぼん / ぽん',
    emoji: '✏️',
    categoryDesc: '細長いもの（ペン・傘・瓶・焼き鳥・電車など）',
    examples: '鉛筆、傘、ビール瓶、焼き鳥、バナナ、映画・電車',
    ruleSummary: 'は行助数詞の代表格！1・6・8・10で「ぽん(促音)」、3・何で「ぼん(連濁)」に変化します。',
    items: buildCounterCells('本', [
      { key: '1', kanji: '一本', hira: 'いっぽん', type: 'sokuon', note: '⚡ 1＋ほん → いっぽん' },
      { key: '2', kanji: '二本', hira: 'にほん', type: 'normal', note: 'そのまま「にほん」' },
      { key: '3', kanji: '三本', hira: 'さんぼん', type: 'rendaku', note: '🔔 3＋ほん → 連濁「さんぼん」' },
      { key: '4', kanji: '四本', hira: 'よんほん', type: 'normal', note: 'そのまま「よんほん」' },
      { key: '5', kanji: '五本', hira: 'ごほん', type: 'normal', note: 'そのまま「ごほん」' },
      { key: '6', kanji: '六本', hira: 'ろっぽん', type: 'sokuon', note: '⚡ 6＋ほん → ろっぽん' },
      { key: '7', kanji: '七本', hira: 'ななほん', alt: ['しちほん'], type: 'normal', note: 'そのまま「ななほん」' },
      { key: '8', kanji: '八本', hira: 'はっぽん', type: 'sokuon', note: '⚡ 8＋ほん → はっぽん' },
      { key: '9', kanji: '九本', hira: 'きゅうほん', type: 'normal', note: 'そのまま「きゅうほん」' },
      { key: '10', kanji: '十本', hira: 'じゅっぽん', alt: ['じっぽん'], type: 'sokuon', note: '⚡ 10＋ほん → じゅっぽん' },
      { key: '?', kanji: '何本', hira: 'なんぼん', type: 'rendaku', note: '🔔 何＋ほん → 連濁「なんぼん」' },
    ]),
  },
  {
    id: 'hai',
    symbol: '杯',
    name: '〜杯 (杯/碗饮品)',
    kanaName: 'はい / ばい / ぱい',
    emoji: '🍺',
    categoryDesc: 'コップ・器に入った飲み物や料理、イカ・タコ',
    examples: '生ビール、コーヒー、ラーメン、お茶、水',
    ruleSummary: '「〜本」と全く同じ「は行」音変化パターン！居酒屋やカフェの注文で必須です。',
    items: buildCounterCells('杯', [
      { key: '1', kanji: '一杯', hira: 'いっぱい', type: 'sokuon', note: '⚡ 1＋はい → いっぱい' },
      { key: '2', kanji: '二杯', hira: 'にはい', type: 'normal', note: 'そのまま「にはい」' },
      { key: '3', kanji: '三杯', hira: 'さんばい', type: 'rendaku', note: '🔔 3＋はい → 連濁「さんばい」' },
      { key: '4', kanji: '四杯', hira: 'よんはい', type: 'normal', note: 'そのまま「よんはい」' },
      { key: '5', kanji: '五杯', hira: 'ごはい', type: 'normal', note: 'そのまま「ごはい」' },
      { key: '6', kanji: '六杯', hira: 'ろっぱい', type: 'sokuon', note: '⚡ 6＋はい → ろっぱい' },
      { key: '7', kanji: '七杯', hira: 'ななはい', alt: ['しちはい'], type: 'normal', note: 'そのまま「ななはい」' },
      { key: '8', kanji: '八杯', hira: 'はっぱい', alt: ['はちはい'], type: 'sokuon', note: '⚡ 8＋はい → はっぱい' },
      { key: '9', kanji: '九杯', hira: 'きゅうはい', type: 'normal', note: 'そのまま「きゅうはい」' },
      { key: '10', kanji: '十杯', hira: 'じゅっぱい', alt: ['じっぱい'], type: 'sokuon', note: '⚡ 10＋はい → じゅっぱい' },
      { key: '?', kanji: '何杯', hira: 'なんばい', type: 'rendaku', note: '🔔 何＋はい → 連濁「なんばい」' },
    ]),
  },
  {
    id: 'hiki',
    symbol: '匹',
    name: '〜匹 (小动物/鱼虫)',
    kanaName: 'ひき / びき / ぴき',
    emoji: '🐶',
    categoryDesc: '犬・猫・魚・虫などの小動物',
    examples: '犬、猫、ハムスター、金魚、カブトムシ',
    ruleSummary: 'これも「は行」パターン！1・6・8・10が「ぴき」、3・何が「びき」になります。',
    items: buildCounterCells('匹', [
      { key: '1', kanji: '一匹', hira: 'いっぴき', type: 'sokuon', note: '⚡ 1＋ひき → いっぴき' },
      { key: '2', kanji: '二匹', hira: 'にひき', type: 'normal', note: 'そのまま「にひき」' },
      { key: '3', kanji: '三匹', hira: 'さんびき', type: 'rendaku', note: '🔔 3＋ひき → 連濁「さんびき」' },
      { key: '4', kanji: '四匹', hira: 'よんひき', type: 'normal', note: 'そのまま「よんひき」' },
      { key: '5', kanji: '五匹', hira: 'ごひき', type: 'normal', note: 'そのまま「ごひき」' },
      { key: '6', kanji: '六匹', hira: 'ろっぴき', type: 'sokuon', note: '⚡ 6＋ひき → ろっぴき' },
      { key: '7', kanji: '七匹', hira: 'ななひき', alt: ['しちひき'], type: 'normal', note: 'そのまま「ななひき」' },
      { key: '8', kanji: '八匹', hira: 'はっぴき', type: 'sokuon', note: '⚡ 8＋ひき → はっぴき' },
      { key: '9', kanji: '九匹', hira: 'きゅうひき', type: 'normal', note: 'そのまま「きゅうひき」' },
      { key: '10', kanji: '十匹', hira: 'じゅっぴき', alt: ['じっぴき'], type: 'sokuon', note: '⚡ 10＋ひき → じゅっぴき' },
      { key: '?', kanji: '何匹', hira: 'なんびき', type: 'rendaku', note: '🔔 何＋ひき → 連濁「なんびき」' },
    ]),
  },
  {
    id: 'mai',
    symbol: '枚',
    name: '〜枚 (扁平物品)',
    kanaName: 'まい',
    emoji: '📄',
    categoryDesc: '薄くて平たいもの（紙・皿・服・切符・ピザ）',
    examples: '紙、お皿、Tシャツ、チケット、写真、お好み焼き',
    ruleSummary: 'ま行なので音変化はゼロ！数字をそのまま付けて「〜まい」と読めばOKの安心助数詞。',
    items: buildCounterCells('枚', [
      { key: '1', kanji: '一枚', hira: 'いちまい', type: 'normal', note: '音変化なし：いち＋まい' },
      { key: '2', kanji: '二枚', hira: 'にまい', type: 'normal', note: 'に＋まい' },
      { key: '3', kanji: '三枚', hira: 'さんまい', type: 'normal', note: 'さん＋まい' },
      { key: '4', kanji: '四枚', hira: 'よんまい', type: 'normal', note: 'よん＋まい' },
      { key: '5', kanji: '五枚', hira: 'ごまい', type: 'normal', note: 'ご＋まい' },
      { key: '6', kanji: '六枚', hira: 'ろくまい', type: 'normal', note: 'ろく＋まい' },
      { key: '7', kanji: '七枚', hira: 'ななまい', alt: ['しちまい'], type: 'normal', note: 'なな＋まい' },
      { key: '8', kanji: '八枚', hira: 'はちまい', type: 'normal', note: 'はち＋まい' },
      { key: '9', kanji: '九枚', hira: 'きゅうまい', type: 'normal', note: 'きゅう＋まい' },
      { key: '10', kanji: '十枚', hira: 'じゅうまい', type: 'normal', note: 'じゅう＋まい' },
      { key: '?', kanji: '何枚', hira: 'なんまい', type: 'normal', note: 'なん＋まい' },
    ]),
  },
  {
    id: 'dai',
    symbol: '台',
    name: '〜台 (机器/车辆)',
    kanaName: 'だい',
    emoji: '🚗',
    categoryDesc: '乗り物・機械・家電・パソコン・スマホ',
    examples: '車、自転車、パソコン、スマホ、テレビ、洗濯機',
    ruleSummary: 'だ行なので音変化なし！そのまま「数字＋だい」と読みます。',
    items: buildCounterCells('台', [
      { key: '1', kanji: '一台', hira: 'いちだい', type: 'normal', note: 'いち＋だい' },
      { key: '2', kanji: '二台', hira: 'にだい', type: 'normal', note: 'に＋だい' },
      { key: '3', kanji: '三台', hira: 'さんだい', type: 'normal', note: 'さん＋だい' },
      { key: '4', kanji: '四台', hira: 'よんだい', type: 'normal', note: 'よん＋だい' },
      { key: '5', kanji: '五台', hira: 'ごだい', type: 'normal', note: 'ご＋だい' },
      { key: '6', kanji: '六台', hira: 'ろくだい', type: 'normal', note: 'ろく＋だい' },
      { key: '7', kanji: '七台', hira: 'ななだい', alt: ['しちだい'], type: 'normal', note: 'なな＋だい' },
      { key: '8', kanji: '八台', hira: 'はちだい', type: 'normal', note: 'はち＋だい' },
      { key: '9', kanji: '九台', hira: 'きゅうだい', type: 'normal', note: 'きゅう＋だい' },
      { key: '10', kanji: '十台', hira: 'じゅうだい', type: 'normal', note: 'じゅう＋だい' },
      { key: '?', kanji: '何台', hira: 'なんだい', type: 'normal', note: 'なん＋だい' },
    ]),
  },
  {
    id: 'kai',
    symbol: '階',
    name: '〜階 (建筑楼层)',
    kanaName: 'かい / がい',
    emoji: '🏢',
    categoryDesc: '建物のフロア・階層（〜回も同じ音変化！）',
    examples: 'デパートの売り場、ホテルの部屋、マンション',
    ruleSummary: 'か行助数詞：1・6・8・10で促音「っかい」、3階と何階は連濁して「さんがい / なんがい」になる点に注意！',
    items: buildCounterCells('階', [
      { key: '1', kanji: '一階', hira: 'いっかい', type: 'sokuon', note: '⚡ 1＋かい → いっかい' },
      { key: '2', kanji: '二階', hira: 'にかい', type: 'normal', note: 'に＋かい' },
      { key: '3', kanji: '三階', hira: 'さんがい', alt: ['さんかい'], type: 'rendaku', note: '🔔 3階は連濁「さんがい」が伝統的（さんかいも可）' },
      { key: '4', kanji: '四階', hira: 'よんかい', type: 'normal', note: 'よん＋かい' },
      { key: '5', kanji: '五階', hira: 'ごかい', type: 'normal', note: 'ご＋かい' },
      { key: '6', kanji: '六階', hira: 'ろっかい', type: 'sokuon', note: '⚡ 6＋かい → ろっかい' },
      { key: '7', kanji: '七階', hira: 'ななかい', alt: ['しちかい'], type: 'normal', note: 'なな＋かい' },
      { key: '8', kanji: '八階', hira: 'はっかい', alt: ['はちかい'], type: 'sokuon', note: '⚡ 8＋かい → はっかい（はちかい も可）' },
      { key: '9', kanji: '九階', hira: 'きゅうかい', type: 'normal', note: 'きゅう＋かい' },
      { key: '10', kanji: '十階', hira: 'じゅっかい', alt: ['じっかい'], type: 'sokuon', note: '⚡ 10＋かい → じゅっかい' },
      { key: '?', kanji: '何階', hira: 'なんがい', alt: ['なんかい'], type: 'rendaku', note: '🔔 何階は「なんがい」（回数と区別！）' },
    ]),
  },
  {
    id: 'ko',
    symbol: '個',
    name: '〜個 (小型立体物)',
    kanaName: 'こ',
    emoji: '📦',
    categoryDesc: '小さくて丸いもの・立体的な品物',
    examples: '卵、おにぎり、ケーキ、荷物、消しゴム、バッジ',
    ruleSummary: 'か行なので 1・6・8・10 で促音「っこ」になります（3個は濁らず「さんこ」）。',
    items: buildCounterCells('個', [
      { key: '1', kanji: '一個', hira: 'いっこ', type: 'sokuon', note: '⚡ 1＋こ → いっこ' },
      { key: '2', kanji: '二個', hira: 'にこ', type: 'normal', note: 'に＋こ' },
      { key: '3', kanji: '三個', hira: 'さんこ', type: 'normal', note: 'そのまま「さんこ」（濁らない）' },
      { key: '4', kanji: '四個', hira: 'よんこ', type: 'normal', note: 'よん＋こ' },
      { key: '5', kanji: '五個', hira: 'ごこ', type: 'normal', note: 'ご＋こ' },
      { key: '6', kanji: '六個', hira: 'ろっこ', type: 'sokuon', note: '⚡ 6＋こ → ろっこ' },
      { key: '7', kanji: '七個', hira: 'ななこ', alt: ['しちこ'], type: 'normal', note: 'なな＋こ' },
      { key: '8', kanji: '八個', hira: 'はっこ', alt: ['はちこ'], type: 'sokuon', note: '⚡ 8＋こ → はっこ' },
      { key: '9', kanji: '九個', hira: 'きゅうこ', type: 'normal', note: 'きゅう＋こ' },
      { key: '10', kanji: '十個', hira: 'じゅっこ', alt: ['じっこ'], type: 'sokuon', note: '⚡ 10＋こ → じゅっこ' },
      { key: '?', kanji: '何個', hira: 'なんこ', type: 'normal', note: 'なん＋こ' },
    ]),
  },
  {
    id: 'sai',
    symbol: '歳',
    name: '〜歳 (年龄)',
    kanaName: 'さい / はたち',
    emoji: '🎂',
    categoryDesc: '年齢を表す助数詞（「才」と書くことも）',
    examples: '人間の年齢、ペットの年齢',
    ruleSummary: 'さ行助数詞：1・8・10で促音「っさい」（6歳は「ろくさい」で促音にならない！）。20歳は特別に「はたち」！',
    items: buildCounterCells('歳', [
      { key: '1', kanji: '一歳', hira: 'いっさい', type: 'sokuon', note: '⚡ 1＋さい → いっさい' },
      { key: '2', kanji: '二歳', hira: 'にさい', type: 'normal', note: 'に＋さい' },
      { key: '3', kanji: '三歳', hira: 'さんさい', type: 'normal', note: 'さん＋さい' },
      { key: '4', kanji: '四歳', hira: 'よんさい', type: 'normal', note: 'よん＋さい' },
      { key: '5', kanji: '五歳', hira: 'ごさい', type: 'normal', note: 'ご＋さい' },
      { key: '6', kanji: '六歳', hira: 'ろくさい', type: 'normal', note: '💡 さ行なので6は詰まらず「ろくさい」' },
      { key: '7', kanji: '七歳', hira: 'ななさい', alt: ['しちさい'], type: 'normal', note: 'なな＋さい' },
      { key: '8', kanji: '八歳', hira: 'はっさい', type: 'sokuon', note: '⚡ 8＋さい → はっさい' },
      { key: '9', kanji: '九歳', hira: 'きゅうさい', type: 'normal', note: 'きゅう＋さい' },
      { key: '10', kanji: '十歳', hira: 'じゅっさい', alt: ['じっさい'], type: 'sokuon', note: '⚡ 10＋さい → じゅっさい' },
      { key: '?', kanji: '何歳', hira: 'なんさい', alt: ['おいくつ'], type: 'normal', note: 'なんさい（丁寧語は「おいくつ」）' },
    ]),
  },
];

export function getDynamicCounterReading(counterId: string, num: number): CounterCell {
  const def = COUNTERS_DATA.find((c) => c.id === counterId) || COUNTERS_DATA[0];
  if (num >= 1 && num <= 10) {
    return def.items.find((i) => i.countKey === String(num))!;
  }
  if (counterId === 'sai' && num === 20) {
    return {
      countKey: '20',
      display: '20歳',
      kanji: '二十歳',
      hiragana: 'はたち',
      altHiragana: ['にじゅっさい'],
      romaji: 'hatachi',
      changeType: 'special',
      note: '🌸 20歳は特別な和語「はたち」と読みます！',
    };
  }
  if (counterId === 'tsu' && num > 10) {
    const koDef = COUNTERS_DATA.find((c) => c.id === 'ko')!;
    const cell = getDynamicCounterReading('ko', num);
    return {
      ...cell,
      note: `💡「〜つ」は10(とお)まで！11以上は「${koDef.symbol}（こ）」やそのままの数字で数えます。`,
    };
  }

  const tens = Math.floor(num / 10);
  const ones = num % 10;

  if (ones === 0) {
    const tenCell = def.items.find((i) => i.countKey === '10')!;
    const prefixNum = convertNumberToJapanese(tens, false);
    const prefixK = tens === 1 ? '' : prefixNum.kanji;
    const prefixH = tens === 1 ? '' : prefixNum.hiragana;
    const fullHira = `${prefixH}${tenCell.hiragana}`;
    return {
      countKey: String(num),
      display: `${num}${def.symbol}`,
      kanji: `${prefixK}${tenCell.kanji}`,
      hiragana: fullHira,
      altHiragana: tenCell.altHiragana?.map((a) => `${prefixH}${a}`),
      romaji: wanakana.toRomaji(fullHira),
      changeType: tenCell.changeType,
      note: tenCell.note,
    };
  }

  const onesCell = def.items.find((i) => i.countKey === String(ones))!;
  const prefixNum = convertNumberToJapanese(tens * 10, false);
  // Note: 14人 = じゅうよにん, 24人 = にじゅうよにん, whereas 11人 = じゅういちにん (NOT じゅうひとり!)
  if (counterId === 'nin' && (ones === 1 || ones === 2)) {
    const standardOnesHira = ones === 1 ? 'いちにん' : 'ににん';
    const standardOnesKanji = ones === 1 ? '一人' : '二人';
    const fullHira = `${prefixNum.hiragana}${standardOnesHira}`;
    return {
      countKey: String(num),
      display: `${num}人`,
      kanji: `${prefixNum.kanji}${standardOnesKanji}`,
      hiragana: fullHira,
      romaji: wanakana.toRomaji(fullHira),
      changeType: 'normal',
      note: `💡 3人以上・11人以降は「ひとり/ふたり」ではなく音読み「${fullHira}」になります！`,
    };
  }

  const fullHira = `${prefixNum.hiragana}${onesCell.hiragana}`;
  return {
    countKey: String(num),
    display: `${num}${def.symbol}`,
    kanji: `${prefixNum.kanji}${onesCell.kanji}`,
    hiragana: fullHira,
    altHiragana: onesCell.altHiragana?.map((a) => `${prefixNum.hiragana}${a}`),
    romaji: wanakana.toRomaji(fullHira),
    changeType: onesCell.changeType,
    note: onesCell.note,
  };
}

