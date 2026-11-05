import React, { useState } from 'react';
import { Volume2, Filter, Sparkles, BookMarked } from 'lucide-react';
import {
  COUNTERS_DATA,
  DAYS_OF_MONTH_DATA,
  HOURS_DATA,
  MINUTES_ONE_TO_TEN,
  MONTHS_DATA,
  SOUND_CHANGE_META,
  SoundChangeType,
  WEEKDAYS_DATA,
  convertNumberToJapanese,
} from '../../data/japaneseNumbers';
import { gameAudio, speakJapanese } from '../../engine/audio';
import { CharacterMood } from '../../components/ShopkeeperAvatar';

interface KnowledgeScrollTableProps {
  onMoodChange: (mood: CharacterMood, speech?: string) => void;
}

type ScrollChapter = 'counters_matrix' | 'dates_times' | 'large_numbers_rules';
type HighlightFilter = 'all' | SoundChangeType;

export const KnowledgeScrollTable: React.FC<KnowledgeScrollTableProps> = ({ onMoodChange }) => {
  const [chapter, setChapter] = useState<ScrollChapter>('counters_matrix');
  const [highlightFilter, setHighlightFilter] = useState<HighlightFilter>('all');
  const [inspectedItem, setInspectedItem] = useState<{
    display: string;
    kanji: string;
    hiragana: string;
    romaji: string;
    changeType: SoundChangeType;
    note: string;
  }>({
    display: '3杯',
    kanji: '三杯',
    hiragana: 'さんばい',
    romaji: 'sanbai',
    changeType: 'rendaku',
    note: '🔔 3＋はい → 連濁「さんばい」（表のマス目をクリックすると発音と解説が見られます）',
  });

  const handleInspect = (item: typeof inspectedItem) => {
    gameAudio.playClick();
    setInspectedItem(item);
    speakJapanese(item.hiragana, 0.95);
    onMoodChange('happy', `『${item.display}』は「${item.hiragana}」！${item.note}`);
  };

  const countRows = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?'];

  // Precompute 100s and 1000s table for Chapter 3
  const hundredsList = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => convertNumberToJapanese(n, false));
  const thousandsList = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000].map((n) =>
    convertNumberToJapanese(n, false)
  );

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden h-full">
      {/* Top Scroll Chapter Tabs + Sound Change Spotlight Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-washi-light border-2 border-aiiro rounded-2xl p-2 shadow-sm shrink-0">
        {/* Scroll Chapters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              gameAudio.playPageFlip();
              setChapter('counters_matrix');
            }}
            className={`game-btn px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm border-2 ${
              chapter === 'counters_matrix'
                ? 'bg-matcha text-white border-aiiro-dark shadow-game-btn'
                : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
            }`}
          >
            📜 壱の巻：助数詞10種マトリックス表
          </button>

          <button
            onClick={() => {
              gameAudio.playPageFlip();
              setChapter('dates_times');
            }}
            className={`game-btn px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm border-2 ${
              chapter === 'dates_times'
                ? 'bg-kohaku text-sumi border-aiiro-dark shadow-game-btn'
                : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
            }`}
          >
            📜 弐の巻：月・日・曜日・時間 完全表
          </button>

          <button
            onClick={() => {
              gameAudio.playPageFlip();
              setChapter('large_numbers_rules');
            }}
            className={`game-btn px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm border-2 ${
              chapter === 'large_numbers_rules'
                ? 'bg-shuiro text-white border-aiiro-dark shadow-game-btn'
                : 'bg-washi text-sumi border-washi-border hover:bg-washi-dark'
            }`}
          >
            📜 参の巻：百・千・万と音変化の黄金法則
          </button>
        </div>

        {/* Sound Change Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-sumi-muted font-bold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> 音変フィルタ:
          </span>
          {(
            [
              { id: 'all', label: 'すべて' },
              { id: 'sokuon', label: '⚡ 促音(っ)' },
              { id: 'rendaku', label: '🔔 連濁(ば/が)' },
              { id: 'special', label: '🌸 特殊訓読' },
            ] as Array<{ id: HighlightFilter; label: string }>
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => {
                gameAudio.playClick();
                setHighlightFilter(f.id);
              }}
              className={`game-btn px-2.5 py-1 rounded-lg font-extrabold border ${
                highlightFilter === f.id
                  ? 'bg-aiiro text-kohaku-light border-aiiro-dark'
                  : 'bg-washi text-sumi border-washi-border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Selected Cell Inspector Bar */}
      <div className="bg-aiiro text-washi-light border-2 border-aiiro-dark rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
              SOUND_CHANGE_META[inspectedItem.changeType].badgeClass
            }`}
          >
            {SOUND_CHANGE_META[inspectedItem.changeType].shortLabel}
          </span>
          <div>
            <span className="text-lg sm:text-xl font-black text-kohaku-light mr-2">
              {inspectedItem.display}（{inspectedItem.kanji}）
            </span>
            <span className="text-xl sm:text-2xl font-black text-white mr-2">
              『{inspectedItem.hiragana}』
            </span>
            <span className="text-xs font-mono text-washi-dark">{inspectedItem.romaji}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-washi-dark hidden md:inline">
            {inspectedItem.note}
          </span>
          <button
            onClick={() => speakJapanese(inspectedItem.hiragana, 0.9)}
            className="game-btn flex items-center gap-1 bg-shuiro hover:bg-shuiro-light text-white font-extrabold text-xs px-3 py-1.5 rounded-xl border border-washi-light/30"
          >
            <Volume2 className="w-4 h-4" />
            <span>発音</span>
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* CHAPTER 1: 10 COUNTERS MATRIX TABLE                */}
      {/* ================================================= */}
      {chapter === 'counters_matrix' && (
        <div className="flex-1 bg-washi-light border-4 border-aiiro rounded-3xl overflow-auto game-scroll shadow-game-card">
          <table className="w-full border-collapse text-center min-w-[880px]">
            <thead className="sticky top-0 z-10 bg-aiiro text-washi-light">
              <tr>
                <th className="py-2.5 px-2 border-b-2 border-r border-aiiro-light text-xs font-black w-16">
                  数 ＼ 助数詞
                </th>
                {COUNTERS_DATA.map((c) => (
                  <th
                    key={c.id}
                    className="py-2 px-2 border-b-2 border-r border-aiiro-light text-xs font-black"
                  >
                    <div className="text-base">{c.emoji} 〜{c.symbol}</div>
                    <div className="text-[10px] text-kohaku-light font-bold">{c.kanaName}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {countRows.map((rowKey) => (
                <tr key={rowKey} className="border-b border-washi-border hover:bg-washi-dark/30">
                  <td className="py-2 px-2 bg-washi-dark font-black text-sm text-aiiro border-r border-washi-border">
                    {rowKey === '?' ? '疑問詞' : rowKey}
                  </td>
                  {COUNTERS_DATA.map((c) => {
                    const cell = c.items.find((i) => i.countKey === rowKey)!;
                    const meta = SOUND_CHANGE_META[cell.changeType];
                    const dimmed =
                      highlightFilter !== 'all' && cell.changeType !== highlightFilter;

                    return (
                      <td
                        key={`${c.id}-${rowKey}`}
                        onClick={() =>
                          handleInspect({
                            display: cell.display,
                            kanji: cell.kanji,
                            hiragana: cell.hiragana,
                            romaji: cell.romaji,
                            changeType: cell.changeType,
                            note: cell.note,
                          })
                        }
                        className={`py-2 px-1.5 border-r border-washi-border cursor-pointer transition-all hover:scale-[1.03] ${
                          dimmed ? 'opacity-25' : 'opacity-100'
                        } ${
                          cell.changeType === 'normal'
                            ? 'bg-washi-light text-sumi'
                            : `${meta.badgeClass}`
                        }`}
                      >
                        <div className="text-[11px] font-bold opacity-85">{cell.display}</div>
                        <div className="text-xs sm:text-sm font-black leading-tight">{cell.hiragana}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================= */}
      {/* CHAPTER 2: DATES, MONTHS, WEEKDAYS & TIME TABLE    */}
      {/* ================================================= */}
      {chapter === 'dates_times' && (
        <div className="flex-1 overflow-y-auto game-scroll space-y-4 pr-1">
          {/* 1. Calendar Days 1日~31日 */}
          <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card">
            <h3 className="text-sm font-black text-aiiro mb-2 flex items-center gap-2">
              <span>📅 日付（1日〜31日・何日）一覧表</span>
              <span className="text-xs font-bold text-matcha-dark">
                ※ 1日〜10日・14日・20日・24日の和語訓読みは超重要！
              </span>
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {DAYS_OF_MONTH_DATA.map((d) => {
                const meta = SOUND_CHANGE_META[d.changeType];
                const dimmed = highlightFilter !== 'all' && d.changeType !== highlightFilter;
                return (
                  <div
                    key={d.key}
                    onClick={() =>
                      handleInspect({
                        display: d.display,
                        kanji: d.kanji,
                        hiragana: d.hiragana,
                        romaji: d.romaji,
                        changeType: d.changeType,
                        note: d.tip,
                      })
                    }
                    className={`cursor-pointer p-2 rounded-xl border-2 text-center transition-transform hover:scale-105 ${
                      dimmed ? 'opacity-25' : 'opacity-100'
                    } ${
                      d.changeType === 'normal'
                        ? 'bg-washi border-washi-border text-sumi'
                        : `${meta.badgeClass}`
                    }`}
                  >
                    <div className="text-xs font-black">{d.display}</div>
                    <div className="text-xs font-extrabold mt-0.5">{d.hiragana}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Months & Weekdays */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card">
              <h3 className="text-sm font-black text-aiiro mb-2">
                🌸 月（1月〜12月・何月）一覧 ※4月・7月・9月注意
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {MONTHS_DATA.map((m) => {
                  const meta = SOUND_CHANGE_META[m.changeType];
                  const dimmed = highlightFilter !== 'all' && m.changeType !== highlightFilter;
                  return (
                    <div
                      key={m.key}
                      onClick={() =>
                        handleInspect({
                          display: m.display,
                          kanji: m.kanji,
                          hiragana: m.hiragana,
                          romaji: m.romaji,
                          changeType: m.changeType,
                          note: m.tip,
                        })
                      }
                      className={`cursor-pointer p-2 rounded-xl border-2 text-center transition-transform hover:scale-105 ${
                        dimmed ? 'opacity-25' : 'opacity-100'
                      } ${
                        m.changeType === 'normal'
                          ? 'bg-washi border-washi-border text-sumi'
                          : `${meta.badgeClass}`
                      }`}
                    >
                      <div className="text-xs font-black">{m.display}</div>
                      <div className="text-xs font-extrabold">{m.hiragana}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card">
              <h3 className="text-sm font-black text-aiiro mb-2">
                🕰️ 時間（1時〜12時）＆ 分（1分〜10分・30分）一覧
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mb-3">
                {HOURS_DATA.map((h) => {
                  const meta = SOUND_CHANGE_META[h.changeType];
                  return (
                    <div
                      key={h.key}
                      onClick={() =>
                        handleInspect({
                          display: h.display,
                          kanji: h.kanji,
                          hiragana: h.hiragana,
                          romaji: h.romaji,
                          changeType: h.changeType,
                          note: h.tip,
                        })
                      }
                      className={`cursor-pointer p-1.5 rounded-xl border text-center ${
                        h.changeType === 'normal'
                          ? 'bg-washi border-washi-border text-sumi'
                          : `${meta.badgeClass}`
                      }`}
                    >
                      <div className="text-xs font-black">{h.display}</div>
                      <div className="text-[11px] font-extrabold">{h.hiragana}</div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {MINUTES_ONE_TO_TEN.map((min) => {
                  const meta = SOUND_CHANGE_META[min.changeType];
                  return (
                    <div
                      key={min.key}
                      onClick={() =>
                        handleInspect({
                          display: min.display,
                          kanji: min.kanji,
                          hiragana: min.hiragana,
                          romaji: min.romaji,
                          changeType: min.changeType,
                          note: min.tip,
                        })
                      }
                      className={`cursor-pointer p-1.5 rounded-xl border text-center ${
                        min.changeType === 'normal'
                          ? 'bg-washi border-washi-border text-sumi'
                          : `${meta.badgeClass}`
                      }`}
                    >
                      <div className="text-xs font-black">{min.display}</div>
                      <div className="text-[11px] font-extrabold">{min.hiragana}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Weekdays */}
          <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card">
            <h3 className="text-sm font-black text-aiiro mb-2">🌙 曜日（月曜日〜日曜日・何曜日）</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {WEEKDAYS_DATA.map((w) => (
                <div
                  key={w.key}
                  onClick={() =>
                    handleInspect({
                      display: w.display,
                      kanji: w.kanji,
                      hiragana: w.hiragana,
                      romaji: w.romaji,
                      changeType: w.changeType,
                      note: w.tip,
                    })
                  }
                  className="cursor-pointer bg-washi hover:bg-washi-dark border-2 border-washi-border rounded-xl p-2 text-center"
                >
                  <div className="text-xs font-black text-aiiro">{w.display}</div>
                  <div className="text-xs font-extrabold text-shuiro mt-0.5">{w.hiragana}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* CHAPTER 3: LARGE NUMBERS & GOLDEN PHONETIC RULES   */}
      {/* ================================================= */}
      {chapter === 'large_numbers_rules' && (
        <div className="flex-1 overflow-y-auto game-scroll space-y-4 pr-1">
          {/* Hundreds & Thousands Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card">
              <h3 className="text-sm font-black text-aiiro mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-shuiro" />
                <span>百の位（100〜900）※300・600・800が変化！</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {hundredsList.map((item) => {
                  const seg = item.segments[0];
                  const meta = SOUND_CHANGE_META[seg.changeType];
                  return (
                    <div
                      key={item.num}
                      onClick={() =>
                        handleInspect({
                          display: item.formatted,
                          kanji: item.kanji,
                          hiragana: item.hiragana,
                          romaji: item.romaji,
                          changeType: seg.changeType,
                          note: seg.note || '標準の百の位読み',
                        })
                      }
                      className={`cursor-pointer p-2.5 rounded-2xl border-2 text-center transition-transform hover:scale-105 ${
                        seg.changeType === 'normal'
                          ? 'bg-washi border-washi-border text-sumi'
                          : `${meta.badgeClass}`
                      }`}
                    >
                      <div className="text-sm font-black">{item.num} ({item.kanji})</div>
                      <div className="text-sm font-extrabold mt-0.5">{item.hiragana}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-4 shadow-game-card">
              <h3 className="text-sm font-black text-aiiro mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-kohaku-dark" />
                <span>千の位（1,000〜9,000）※3000・8000が変化！</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {thousandsList.map((item) => {
                  const seg = item.segments[0];
                  const meta = SOUND_CHANGE_META[seg.changeType];
                  return (
                    <div
                      key={item.num}
                      onClick={() =>
                        handleInspect({
                          display: item.formatted,
                          kanji: item.kanji,
                          hiragana: item.hiragana,
                          romaji: item.romaji,
                          changeType: seg.changeType,
                          note: seg.note || '標準の千の位読み',
                        })
                      }
                      className={`cursor-pointer p-2.5 rounded-2xl border-2 text-center transition-transform hover:scale-105 ${
                        seg.changeType === 'normal'
                          ? 'bg-washi border-washi-border text-sumi'
                          : `${meta.badgeClass}`
                      }`}
                    >
                      <div className="text-sm font-black">{item.formatted} ({item.kanji})</div>
                      <div className="text-sm font-extrabold mt-0.5">{item.hiragana}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Golden Phonetic Rules Cheat Sheet */}
          <div className="bg-washi-light border-4 border-aiiro rounded-3xl p-5 shadow-game-card">
            <h3 className="text-base font-black text-aiiro mb-3 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-shuiro" />
              <span>🏆 店長直伝！日本語助数詞・音変化の「3大黄金法則」</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-shuiro/10 border-2 border-shuiro rounded-2xl p-3.5 space-y-1.5">
                <div className="font-black text-shuiro text-sm">⚡ 法則①：1・6・8・10 の促音便（っ）</div>
                <p className="font-bold text-sumi leading-relaxed">
                  助数詞の1文字目が<strong>「か・さ・た・は行」</strong>のとき、数字の <strong>1・6・8・10</strong> の後ろで小さい「っ」に詰まります。（は行は同時に「ぱ行」へ変化！）
                </p>
                <div className="bg-washi-light rounded-xl p-2 font-extrabold text-sumi">
                  例：1本(いっぽん)・6匹(ろっぴき)・8階(はっかい)・10分(じゅっぷん)
                </div>
              </div>

              <div className="bg-kohaku/20 border-2 border-kohaku-dark rounded-2xl p-3.5 space-y-1.5">
                <div className="font-black text-kohaku-dark text-sm">🔔 法則②：「3」と「何」の連濁（゛）・半濁音</div>
                <p className="font-bold text-sumi leading-relaxed">
                  「3 (さん)」と「何 (なん)」はどちらも<strong>撥音「ん」</strong>で終わるため、後ろに続く「は行・か行・さ行」が濁音（ば・が・ざ）または半濁音（ぱ）に変わりやすいです。
                </p>
                <div className="bg-washi-light rounded-xl p-2 font-extrabold text-sumi">
                  例：300(さんびゃく)・3000(さんぜん)・3杯(さんばい)・3分(さんぷん)
                </div>
              </div>

              <div className="bg-matcha/15 border-2 border-matcha rounded-2xl p-3.5 space-y-1.5">
                <div className="font-black text-matcha-dark text-sm">🌸 法則③：和語訓読み（1〜10日・1〜2人）</div>
                <p className="font-bold text-sumi leading-relaxed">
                  日本古来の数え方（ひとつ〜とお）は、カレンダーの<strong>「1日(ついたち)〜10日(とおか)、20日(はつか)」</strong>や<strong>「1人(ひとり)・2人(ふたり)・20歳(はたち)」</strong>に生きています。
                </p>
                <div className="bg-washi-light rounded-xl p-2 font-extrabold text-sumi">
                  例：4日(よっか) vs 8日(ようか) の長音・促音の違いに注意！
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

