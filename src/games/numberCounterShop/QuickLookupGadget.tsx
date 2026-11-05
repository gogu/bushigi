import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Sparkles, Delete, RotateCcw, Coins, Calendar, Layers, Turtle } from 'lucide-react';
import {
  COUNTERS_DATA,
  DAYS_OF_MONTH_DATA,
  HOURS_DATA,
  MONTHS_DATA,
  SOUND_CHANGE_META,
  WEEKDAYS_DATA,
  convertNumberToJapanese,
  getDynamicCounterReading,
  getMinuteReading,
} from '../../data/japaneseNumbers';
import { gameAudio, speakJapanese } from '../../engine/audio';
import { CharacterMood } from '../../components/ShopkeeperAvatar';

interface QuickLookupGadgetProps {
  onMoodChange: (mood: CharacterMood, speech?: string) => void;
}

type GadgetSubMode = 'price_number' | 'date_time' | 'counter';

export const QuickLookupGadget: React.FC<QuickLookupGadgetProps> = ({ onMoodChange }) => {
  const [subMode, setSubMode] = useState<GadgetSubMode>('price_number');

  // --- Mode 1: Number & Price State ---
  const [numStr, setNumStr] = useState<string>('3800');
  const [includeYen, setIncludeYen] = useState<boolean>(true);

  // --- Mode 2: Date & Time State ---
  const [selectedMonth, setSelectedMonth] = useState<string>('4');
  const [selectedDay, setSelectedDay] = useState<string>('20');
  const [selectedWeekday, setSelectedWeekday] = useState<string>('mon');
  const [selectedHour, setSelectedHour] = useState<string>('4');
  const [selectedMinute, setSelectedMinute] = useState<number>(10);

  // --- Mode 3: Counter Scanner State ---
  const [selectedCounterId, setSelectedCounterId] = useState<string>('hai');
  const [selectedCountKey, setSelectedCountKey] = useState<string>('3');

  // Derived Number Result
  const numericVal = parseInt(numStr || '0', 10) || 0;
  const numResult = convertNumberToJapanese(numericVal, includeYen);

  const handleDigitPress = (digit: string) => {
    gameAudio.playClick();
    setNumStr((prev) => {
      const next = prev === '0' ? digit : prev + digit;
      if (next.length > 11) return prev;
      return String(parseInt(next, 10) || 0);
    });
  };

  const handlePresetNumber = (val: number, yen: boolean) => {
    gameAudio.playCashRegister();
    setNumStr(String(val));
    setIncludeYen(yen);
    const res = convertNumberToJapanese(val, yen);
    speakJapanese(res.hiragana, 0.95);
    if (res.changeNotes.length > 0) {
      onMoodChange('excited', `ピピッ♪「${res.formatted}」は『${res.hiragana}』！${res.changeNotes[0]}`);
    } else {
      onMoodChange('happy', `チャリーン♪「${res.formatted}」は『${res.hiragana}』と読むよ！`);
    }
  };

  // Derived Date & Time Result
  const monthItem = MONTHS_DATA.find((m) => m.key === selectedMonth) || MONTHS_DATA[3];
  const dayItem = DAYS_OF_MONTH_DATA.find((d) => d.key === selectedDay) || DAYS_OF_MONTH_DATA[19];
  const weekdayItem = WEEKDAYS_DATA.find((w) => w.key === selectedWeekday) || WEEKDAYS_DATA[0];
  const hourItem = HOURS_DATA.find((h) => h.key === selectedHour) || HOURS_DATA[3];
  const minuteItem = getMinuteReading(selectedMinute);

  const fullDateHira = `${monthItem.hiragana} ${dayItem.hiragana} (${weekdayItem.hiragana})`;
  const fullTimeHira = `${hourItem.hiragana} ${minuteItem.hiragana}`;

  // Derived Counter Result
  const counterDef = COUNTERS_DATA.find((c) => c.id === selectedCounterId) || COUNTERS_DATA[0];
  const counterCell =
    selectedCountKey === '?'
      ? counterDef.items.find((i) => i.countKey === '?')!
      : getDynamicCounterReading(selectedCounterId, parseInt(selectedCountKey, 10) || 1);

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden h-full">
      {/* Top Gadget Cartridge Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-washi-light border-2 border-aiiro rounded-2xl p-2 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              gameAudio.playClick();
              setSubMode('price_number');
              onMoodChange('happy', 'レジに数字や金額を打ち込むと、音変化の秘密がレシートに印刷されるよ！');
            }}
            className={`game-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-extrabold text-xs sm:text-sm border-2 ${
              subMode === 'price_number'
                ? 'bg-shuiro text-white border-aiiro-dark shadow-game-btn'
                : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>💰 価格・大数字レジ</span>
          </button>

          <button
            onClick={() => {
              gameAudio.playClick();
              setSubMode('date_time');
              onMoodChange('happy', '日めくりカレンダーと時計を動かして、特別な日付（ついたち・はつか等）を調べよう！');
            }}
            className={`game-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-extrabold text-xs sm:text-sm border-2 ${
              subMode === 'date_time'
                ? 'bg-kohaku text-sumi border-aiiro-dark shadow-game-btn'
                : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>📅 日めくり万年暦・時計</span>
          </button>

          <button
            onClick={() => {
              gameAudio.playClick();
              setSubMode('counter');
              onMoodChange('happy', '品物の種類（助数詞）と個数を選ぶと、促音や連濁の変化をスキャンするよ！');
            }}
            className={`game-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-extrabold text-xs sm:text-sm border-2 ${
              subMode === 'counter'
                ? 'bg-matcha text-white border-aiiro-dark shadow-game-btn'
                : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>🍡 助数詞（量詞）スキャナー</span>
          </button>
        </div>

        {/* Color Legend Pills */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-bold">
          <span className="px-2 py-0.5 rounded-md bg-shuiro text-white">⚡ 促音 (っ)</span>
          <span className="px-2 py-0.5 rounded-md bg-kohaku text-sumi">🔔 連濁 (ば/ざ/が)</span>
          <span className="px-2 py-0.5 rounded-md bg-matcha text-white">🌸 特殊訓読</span>
        </div>
      </div>

      {/* ================================================= */}
      {/* SUBMODE 1: PRICE & NUMBER CASH REGISTER            */}
      {/* ================================================= */}
      {subMode === 'price_number' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto game-scroll pr-1">
          {/* Left: Tactile Cash Register Keypad */}
          <div className="lg:col-span-5 bg-aiiro border-4 border-aiiro-dark rounded-3xl p-4 text-washi-light flex flex-col justify-between shadow-game-card">
            <div>
              {/* Register Top Display */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-kohaku-light tracking-wider flex items-center gap-1">
                  📟 BUSHIGI REGISTER EX-2000
                </span>
                <button
                  onClick={() => {
                    gameAudio.playClick();
                    setIncludeYen(!includeYen);
                  }}
                  className={`game-btn text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                    includeYen
                      ? 'bg-kohaku text-sumi border-kohaku-dark'
                      : 'bg-aiiro-dark text-washi-dark border-washi-border/40'
                  }`}
                >
                  {includeYen ? '💴 円 (価格モード ON)' : '🔢 純数字モード'}
                </button>
              </div>

              {/* Digital LCD Screen */}
              <div className="bg-[#16222F] border-4 border-aiiro-light rounded-2xl p-3 mb-3 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-matcha-light font-mono">
                  <span>INPUT VALUE</span>
                  <span>MAX: 999,999,999,999</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-kohaku font-black text-lg">{includeYen ? '¥' : '#'}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={numStr}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                      setNumStr(clean || '0');
                    }}
                    className="bg-transparent text-right font-mono text-2xl sm:text-3xl font-black text-washi-light focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Tricky Number Quick Chips */}
              <div className="mb-3">
                <div className="text-[11px] font-bold text-kohaku-light mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>音変化に注意！頻出金額ワンタッチ試算：</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[300, 600, 800, 3000, 8000, 3800, 10000, 16800].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetNumber(preset, true)}
                      className="game-btn text-xs font-extrabold bg-aiiro-light hover:bg-kohaku hover:text-sumi text-washi-light px-2.5 py-1 rounded-lg border border-washi-border/30"
                    >
                      {preset.toLocaleString()}円
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculator Mechanical Keypad */}
            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDigitPress(d)}
                  className="game-btn bg-washi hover:bg-washi-light text-sumi font-black text-lg py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => {
                  gameAudio.playClick();
                  setNumStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
                }}
                className="game-btn bg-kohaku hover:bg-kohaku-light text-sumi font-black text-sm py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn flex items-center justify-center"
                title="1文字消す"
              >
                <Delete className="w-5 h-5" />
              </button>

              {['4', '5', '6'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDigitPress(d)}
                  className="game-btn bg-washi hover:bg-washi-light text-sumi font-black text-lg py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => {
                  gameAudio.playClick();
                  setNumStr('0');
                }}
                className="game-btn bg-shuiro hover:bg-shuiro-light text-white font-black text-sm py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-4 h-4" /> C
              </button>

              {['1', '2', '3'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDigitPress(d)}
                  className="game-btn bg-washi hover:bg-washi-light text-sumi font-black text-lg py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => {
                  gameAudio.playCashRegister();
                  speakJapanese(numResult.hiragana, 0.95);
                }}
                className="game-btn row-span-2 bg-matcha hover:bg-matcha-light text-white font-black text-sm py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn flex flex-col items-center justify-center gap-1"
              >
                <Volume2 className="w-6 h-6" />
                <span>発音</span>
              </button>

              <button
                onClick={() => handleDigitPress('0')}
                className="game-btn bg-washi hover:bg-washi-light text-sumi font-black text-lg py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn"
              >
                0
              </button>
              <button
                onClick={() => handleDigitPress('00')}
                className="game-btn bg-washi hover:bg-washi-light text-sumi font-black text-base py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn"
              >
                00
              </button>
              <button
                onClick={() => handleDigitPress('000')}
                className="game-btn bg-washi hover:bg-washi-light text-sumi font-black text-base py-2.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn"
              >
                000
              </button>
            </div>
          </div>

          {/* Right: Animated Thermal Receipt Printout */}
          <div className="lg:col-span-7 bg-washi-light border-4 border-aiiro rounded-3xl p-5 shadow-game-card flex flex-col justify-between">
            <div>
              {/* Receipt Header */}
              <div className="flex items-center justify-between border-b-2 border-dashed border-washi-border pb-3 mb-4">
                <div>
                  <span className="text-xs font-extrabold text-sumi-muted">🧾 読み方お会計レシート</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-aiiro mt-0.5">
                    {numResult.formatted}
                    <span className="ml-3 text-lg font-bold text-sumi-muted">（{numResult.kanji}）</span>
                  </h3>
                </div>

                {/* Audio Playback Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      gameAudio.playClick();
                      speakJapanese(numResult.hiragana, 0.95);
                    }}
                    className="game-btn flex items-center gap-1.5 bg-shuiro hover:bg-shuiro-light text-white font-extrabold px-4 py-2.5 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-sm"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>標準朗読</span>
                  </button>
                  <button
                    onClick={() => {
                      gameAudio.playClick();
                      speakJapanese(numResult.hiragana, 0.65);
                    }}
                    title="ゆっくり発音 (慢速朗读)"
                    className="game-btn flex items-center gap-1 bg-washi hover:bg-washi-dark text-sumi font-extrabold px-3 py-2.5 rounded-2xl border-2 border-aiiro-dark shadow-game-btn text-xs"
                  >
                    <Turtle className="w-4 h-4 text-matcha" />
                    <span>ゆっくり</span>
                  </button>
                </div>
              </div>

              {/* Full Reading Box with Segmented Color Highlights */}
              <div className="bg-washi border-2 border-washi-border rounded-2xl p-4 mb-4">
                <div className="text-xs font-bold text-sumi-muted mb-2">
                  ▼ かな読み（色付き部分は音変化ポイント）：
                </div>
                <div className="flex flex-wrap items-baseline gap-1.5 text-2xl sm:text-3xl font-black leading-relaxed selectable-text">
                  {numResult.segments.map((seg, idx) => {
                    const meta = SOUND_CHANGE_META[seg.changeType];
                    return (
                      <span
                        key={idx}
                        onClick={() => speakJapanese(seg.hiragana, 0.9)}
                        title={`${seg.label}: ${seg.kanji} (${seg.hiragana})`}
                        className={`cursor-pointer px-2 py-0.5 rounded-xl border transition-transform hover:scale-105 ${
                          seg.changeType === 'normal'
                            ? 'bg-washi-light border-washi-border text-sumi'
                            : `${meta.badgeClass}`
                        }`}
                      >
                        {seg.hiragana}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2 font-mono text-sm font-bold text-sumi-muted selectable-text">
                  Romaji: {numResult.romaji}
                </div>
              </div>

              {/* Digit Place Breakdown Grid */}
              <div className="mb-3">
                <div className="text-xs font-extrabold text-aiiro mb-2">
                  🔍 桁ごとの分解パーツ（クリックで個別発音）：
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {numResult.segments.map((seg, idx) => {
                    const meta = SOUND_CHANGE_META[seg.changeType];
                    return (
                      <div
                        key={idx}
                        onClick={() => speakJapanese(seg.hiragana, 0.9)}
                        className="cursor-pointer bg-washi hover:bg-washi-dark/60 border-2 border-washi-border rounded-xl p-2.5 flex items-center justify-between transition-all"
                      >
                        <div>
                          <div className="text-[10px] font-bold text-sumi-muted">{seg.label}</div>
                          <div className="text-base font-black text-sumi">{seg.kanji}</div>
                          <div className={`text-xs font-extrabold ${meta.textClass}`}>{seg.hiragana}</div>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${meta.badgeClass}`}>
                          {meta.shortLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sound Change Warning Footer */}
            <div className="bg-kohaku/15 border-2 border-kohaku rounded-2xl p-3">
              {numResult.changeNotes.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-xs font-black text-shuiro flex items-center gap-1">
                    <span>⚡ 音変化のポイント解説：</span>
                  </div>
                  {numResult.changeNotes.map((note, i) => (
                    <div key={i} className="text-xs sm:text-sm font-extrabold text-sumi">
                      ・{note}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs sm:text-sm font-bold text-matcha-dark flex items-center gap-2">
                  <span>✅ この数字には特殊な促音・連濁変化はありません。基本通りに読めばOK！</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* SUBMODE 2: PERPETUAL CALENDAR & CLOCK              */}
      {/* ================================================= */}
      {subMode === 'date_time' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto game-scroll pr-1">
          {/* Left: Interactive Calendar & Clock Controls */}
          <div className="lg:col-span-7 bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card flex flex-col gap-4">
            {/* Month Selector */}
            <div>
              <div className="text-xs font-black text-aiiro mb-1.5 flex items-center justify-between">
                <span>🌸 月を選ぶ (1月〜12月・何月)：</span>
                <span className="text-[11px] text-shuiro font-bold">※ 4月(しがつ)・7月(しちがつ)・9月(くがつ)に注意！</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {MONTHS_DATA.map((m) => {
                  const active = selectedMonth === m.key;
                  const isSpecial = m.changeType !== 'normal';
                  return (
                    <button
                      key={m.key}
                      onClick={() => {
                        gameAudio.playPageFlip();
                        setSelectedMonth(m.key);
                        speakJapanese(m.hiragana, 0.95);
                      }}
                      className={`game-btn py-1.5 px-1 rounded-xl border-2 text-xs font-extrabold flex flex-col items-center ${
                        active
                          ? 'bg-shuiro text-white border-aiiro-dark shadow-game-btn'
                          : isSpecial
                          ? 'bg-kohaku/25 text-shuiro-dark border-kohaku'
                          : 'bg-washi text-sumi border-washi-border'
                      }`}
                    >
                      <span>{m.display}</span>
                      <span className="text-[10px] opacity-85 truncate max-w-full">{m.hiragana}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day of Month Selector */}
            <div>
              <div className="text-xs font-black text-aiiro mb-1.5 flex items-center justify-between">
                <span>📅 日を選ぶ (1日〜31日・何日)：</span>
                <span className="text-[11px] text-matcha-dark font-bold">※ 1日〜10日・14日・20日・24日は特殊訓読み！</span>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {DAYS_OF_MONTH_DATA.map((d) => {
                  const active = selectedDay === d.key;
                  const isSpecial = d.changeType !== 'normal';
                  return (
                    <button
                      key={d.key}
                      onClick={() => {
                        gameAudio.playPageFlip();
                        setSelectedDay(d.key);
                        speakJapanese(d.hiragana, 0.95);
                      }}
                      className={`game-btn py-1 rounded-xl border text-xs font-extrabold flex flex-col items-center ${
                        active
                          ? 'bg-matcha text-white border-aiiro-dark shadow-sm'
                          : isSpecial
                          ? 'bg-matcha/15 text-matcha-dark border-matcha/50 font-black'
                          : 'bg-washi text-sumi border-washi-border'
                      }`}
                    >
                      <span>{d.display}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weekday + Clock Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-dashed border-washi-border">
              {/* Weekday */}
              <div>
                <div className="text-xs font-black text-aiiro mb-1.5">🌙 曜日を選ぶ：</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {WEEKDAYS_DATA.map((w) => (
                    <button
                      key={w.key}
                      onClick={() => {
                        gameAudio.playClick();
                        setSelectedWeekday(w.key);
                        speakJapanese(w.hiragana, 0.95);
                      }}
                      className={`game-btn py-1.5 px-1 rounded-xl border text-xs font-extrabold ${
                        selectedWeekday === w.key
                          ? 'bg-aiiro text-white border-aiiro-dark'
                          : 'bg-washi text-sumi border-washi-border'
                      }`}
                    >
                      {w.display.replace('曜日', '曜')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hour & Minute */}
              <div>
                <div className="text-xs font-black text-aiiro mb-1.5">🕰️ 時刻（時・分）を選ぶ：</div>
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={selectedHour}
                    onChange={(e) => {
                      setSelectedHour(e.target.value);
                      const h = HOURS_DATA.find((item) => item.key === e.target.value);
                      if (h) speakJapanese(h.hiragana, 0.95);
                    }}
                    className="bg-washi border-2 border-aiiro rounded-xl px-2.5 py-1.5 font-extrabold text-sm text-sumi"
                  >
                    {HOURS_DATA.map((h) => (
                      <option key={h.key} value={h.key}>
                        {h.display} ({h.hiragana})
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedMinute}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSelectedMinute(val);
                      speakJapanese(getMinuteReading(val).hiragana, 0.95);
                    }}
                    className="bg-washi border-2 border-aiiro rounded-xl px-2.5 py-1.5 font-extrabold text-sm text-sumi flex-1"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 45].map((m) => {
                      const mr = getMinuteReading(m);
                      return (
                        <option key={m} value={m}>
                          {mr.display} ({mr.hiragana})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Japanese Tear-Off Calendar Flip Card Display */}
          <div className="lg:col-span-5 bg-washi-light border-4 border-aiiro rounded-3xl overflow-hidden shadow-game-card flex flex-col justify-between">
            {/* Tear-Off Calendar Red Top Binder */}
            <div className="bg-shuiro border-b-4 border-aiiro px-5 py-3 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold opacity-90">日めくり万年カレンダー</div>
                <div className="text-xl font-black tracking-wide">
                  {monthItem.display}（{monthItem.hiragana}）
                </div>
              </div>
              <button
                onClick={() => {
                  gameAudio.playClick();
                  speakJapanese(`${monthItem.hiragana}、${dayItem.hiragana}、${weekdayItem.hiragana}`, 0.9);
                }}
                className="game-btn bg-washi-light text-shuiro font-extrabold px-3 py-1.5 rounded-xl border-2 border-aiiro-dark shadow-game-btn text-xs flex items-center gap-1"
              >
                <Volume2 className="w-4 h-4" />
                <span>日付を朗読</span>
              </button>
            </div>

            {/* Big Day Display */}
            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="text-center bg-washi border-2 border-washi-border rounded-3xl p-4 relative">
                <span
                  className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded-full border mb-1 ${
                    SOUND_CHANGE_META[dayItem.changeType].badgeClass
                  }`}
                >
                  {SOUND_CHANGE_META[dayItem.changeType].label}
                </span>
                <div className="text-4xl sm:text-5xl font-black text-aiiro my-1">{dayItem.display}</div>
                <div className="text-2xl sm:text-3xl font-black text-shuiro">{dayItem.hiragana}</div>
                <div className="text-xs font-mono font-bold text-sumi-muted mt-0.5">{dayItem.romaji}</div>

                <div className="mt-3 pt-2 border-t border-dashed border-washi-border flex flex-col items-center justify-center gap-0.5 text-xs font-extrabold text-sumi">
                  <span>{weekdayItem.display}：{weekdayItem.hiragana}</span>
                  <span className="text-[11px] text-aiiro">通し読み：{fullDateHira}</span>
                </div>
              </div>

              {/* Clock Reading Card */}
              <div className="bg-aiiro text-washi-light rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-kohaku-light font-bold">🕰️ 選択中の時刻読み</div>
                  <div className="text-lg font-black">
                    {hourItem.display}{minuteItem.display} ＝{' '}
                    <span className="text-kohaku-light">{fullTimeHira}</span>
                  </div>
                </div>
                <button
                  onClick={() => speakJapanese(`${hourItem.hiragana}${minuteItem.hiragana}`, 0.9)}
                  className="game-btn bg-kohaku text-sumi p-2 rounded-xl border-2 border-aiiro-dark"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Tips Breakdown */}
              <div className="bg-matcha/10 border-2 border-matcha rounded-2xl p-3 space-y-1 text-xs font-bold text-sumi">
                <div>・<strong className="text-shuiro">{monthItem.display}</strong>：{monthItem.tip}</div>
                <div>・<strong className="text-matcha-dark">{dayItem.display}</strong>：{dayItem.tip}</div>
                <div>・<strong className="text-aiiro">{hourItem.display}{minuteItem.display}</strong>：{hourItem.tip} / {minuteItem.tip}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* SUBMODE 3: COUNTER SCANNER (助数詞スキャナー)        */}
      {/* ================================================= */}
      {subMode === 'counter' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto game-scroll pr-1">
          {/* Left: 10 Counter Category Cartridges + Quantity Picker */}
          <div className="lg:col-span-6 bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-black text-aiiro mb-2">
                ① 数えたい品物（助数詞 10種）を選択：
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {COUNTERS_DATA.map((c) => {
                  const active = selectedCounterId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        gameAudio.playClick();
                        setSelectedCounterId(c.id);
                        const cell =
                          selectedCountKey === '?'
                            ? c.items.find((i) => i.countKey === '?')!
                            : getDynamicCounterReading(c.id, parseInt(selectedCountKey, 10) || 1);
                        speakJapanese(cell.hiragana, 0.95);
                      }}
                      className={`game-btn p-2 rounded-2xl border-2 flex flex-col items-center text-center ${
                        active
                          ? 'bg-matcha text-white border-aiiro-dark shadow-game-btn'
                          : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
                      }`}
                    >
                      <span className="text-2xl">{c.emoji}</span>
                      <span className="text-xs font-black mt-0.5">〜{c.symbol}</span>
                      <span className="text-[10px] opacity-80 truncate max-w-full">
                        {c.name.replace(/〜.\s*/, '')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Picker */}
            <div>
              <div className="text-xs font-black text-aiiro mb-2">
                ② 個数・疑問詞（1〜10・20・何〜）を選択：
              </div>
              <div className="grid grid-cols-6 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '20', '?'].map((k) => {
                  const active = selectedCountKey === k;
                  const previewCell =
                    k === '?'
                      ? counterDef.items.find((i) => i.countKey === '?')!
                      : getDynamicCounterReading(selectedCounterId, parseInt(k, 10));
                  const isChanged = previewCell.changeType !== 'normal';

                  return (
                    <button
                      key={k}
                      onClick={() => {
                        gameAudio.playClick();
                        setSelectedCountKey(k);
                        speakJapanese(previewCell.hiragana, 0.95);
                      }}
                      className={`game-btn py-2 px-1 rounded-xl border-2 font-extrabold text-xs flex flex-col items-center ${
                        active
                          ? 'bg-shuiro text-white border-aiiro-dark shadow-game-btn'
                          : isChanged
                          ? 'bg-kohaku/20 text-shuiro-dark border-kohaku'
                          : 'bg-washi text-sumi border-washi-border'
                      }`}
                    >
                      <span className="text-sm font-black">{k === '?' ? `何${counterDef.symbol}` : `${k}${counterDef.symbol}`}</span>
                      <span className="text-[10px] truncate max-w-full">{previewCell.hiragana}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Counter Rule Summary Box */}
            <div className="bg-washi border-2 border-washi-border rounded-2xl p-3 text-xs">
              <div className="font-black text-aiiro mb-1">
                {counterDef.emoji} 『{counterDef.name}』の対象と法則：
              </div>
              <div className="font-bold text-sumi-muted mb-1">・対象：{counterDef.examples}</div>
              <div className="font-extrabold text-shuiro">・法則：{counterDef.ruleSummary}</div>
            </div>
          </div>

          {/* Right: Scanner Output Screen + 1-10 Quick Comparison */}
          <div className="lg:col-span-6 bg-washi-light border-4 border-aiiro rounded-3xl p-5 shadow-game-card flex flex-col justify-between gap-3">
            <motion.div
              key={`${selectedCounterId}-${selectedCountKey}`}
              initial={{ scale: 0.96, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-washi border-2 border-aiiro rounded-3xl p-5 text-center relative"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                    SOUND_CHANGE_META[counterCell.changeType].badgeClass
                  }`}
                >
                  {SOUND_CHANGE_META[counterCell.changeType].label}
                </span>
                <button
                  onClick={() => speakJapanese(counterCell.hiragana, 0.9)}
                  className="game-btn flex items-center gap-1.5 bg-shuiro text-white font-extrabold text-xs px-3.5 py-2 rounded-xl border-2 border-aiiro-dark shadow-game-btn"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>発音を聴く</span>
                </button>
              </div>

              <div className="text-4xl sm:text-5xl font-black text-aiiro my-1">
                {counterDef.emoji} {counterCell.display}{' '}
                <span className="text-2xl text-sumi-muted">（{counterCell.kanji}）</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-shuiro mt-1">
                {counterCell.hiragana}
              </div>
              {counterCell.altHiragana && counterCell.altHiragana.length > 0 && (
                <div className="text-xs font-bold text-matcha-dark mt-1">
                  別読み可：{counterCell.altHiragana.join(' / ')}
                </div>
              )}
              <div className="text-xs font-mono font-bold text-sumi-muted mt-1">{counterCell.romaji}</div>

              <div className="mt-3 pt-2.5 border-t border-dashed border-washi-border text-xs sm:text-sm font-extrabold text-sumi">
                💡 {counterCell.note}
              </div>
            </motion.div>

            {/* 1~10 Full Strip Comparison for Current Counter */}
            <div>
              <div className="text-xs font-black text-aiiro mb-1.5">
                📊 『〜{counterDef.symbol}』の 1〜10 音変化一覧（クリックで発音）：
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                {counterDef.items.map((item) => {
                  const meta = SOUND_CHANGE_META[item.changeType];
                  return (
                    <div
                      key={item.countKey}
                      onClick={() => {
                        setSelectedCountKey(item.countKey);
                        speakJapanese(item.hiragana, 0.95);
                      }}
                      className={`cursor-pointer p-1.5 rounded-xl border text-center transition-transform hover:scale-105 ${
                        item.changeType === 'normal'
                          ? 'bg-washi border-washi-border'
                          : `${meta.badgeClass}`
                      }`}
                    >
                      <div className="text-xs font-black">{item.display}</div>
                      <div className="text-[11px] font-extrabold truncate">{item.hiragana}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
