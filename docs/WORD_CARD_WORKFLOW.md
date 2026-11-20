# 日语单词卡扩充生产流程（ことば・つづり屋 SOP）

本文档沉淀了 **『STAGE 02：ことば・つづり屋』** 的标准化词卡生产流水线。以后每次扩充新课程词库（例如《大家的日语》第 4 课、N5/N4 主题词包等），只需按下面 4 步即可快速上线，保证画风统一、无文字剧透且全自动化校验通过。

---

## 整体闭环流程

```text
[Step 1] 在 src/data/wordDecks.ts 定义新词库 (每批建议 20 词，5×4 排布)
   │
   ▼
[Step 2] 使用 AI 生图模型一次性生成 5×4 统一画风“无文字”插画合集图
   │
   ▼
[Step 3] 运行 npm run slice:cards 自动检测分割线并切分为 20 张本地 PNG
   │
   ▼
[Step 4] 注册至 WORD_DECKS，运行 npm run test:spelling && npm run build 校验后发布
```

---

## Step 1：在 `src/data/wordDecks.ts` 定义新词库

1. 为每个新单词规划唯一 `id`（建议格式 `w-<romaji>`，例如 `w-byouin`、`w-ginkou`），并按以下结构定义 `WordDeck` 对象：

```ts
export const DECK_NEW_PACK: WordDeck = {
  id: 'deck-minna-04',
  title: '施設・時間 20単語',
  subtitle: '大家的日语 第4课高频公共场所与日常词汇',
  badge: 'DECK 02 · 20語',
  words: [
    {
      id: 'w-ginkou',
      display: '銀行',
      reading: 'ぎんこう',
      scriptType: 'hiragana',
      meaning: '银行',
      emoji: '🏦',
      imageUrl: './images/words/w-ginkou.png', // ⚠️ 必须使用 ./images/words/<id>.png 相对路径
      categoryLabel: '施設・場所',
      spellingTip: '开头浊音「ぎ」＋拨音「ん」＋长音「こう」（注意不能漏写「う」）',
      // confusableWith: ['w-yuubinkyoku'],    // 可选：关联易混词 ID
      // alternateNote: { input: '...', message: '...' }, // 可选：多读音友好提示重拼
      exampleJp: '銀行は九時から三時までです。',
      exampleZh: '银行从九点营业到三点。',
      distractorChars: ['き', 'ご', 'ち', 'や'],
    },
    // ... 按 5×4 顺序一共填入最多 20 词
  ],
};
```

2. 暂不急着把新词库加入 `WORD_DECKS` 也可以；只要先写入 `src/data/wordDecks.ts`，切图脚本就已经可以通过 `--deck deck-minna-04` 自动读取这批词的顺序与 ID！

---

## Step 2：AI 生图提示词模板（一次生成 20 词合集）

为了确保在**「🖼️ 看图说话」**模式下不泄露日语或中文答案，生成 5×4 网格合集时**必须严格禁止任何文字出现**。可直接复制并替换下方模板中的 20 个场景描述：

```text
Generate ONE high-resolution 4:3 landscape illustration sheet divided into an exact 5 columns x 4 rows grid (20 equal rectangular cells filling the entire canvas edge-to-edge, separated only by thin uniform light-gray #E2E2E2 divider lines, pure white #FFFFFF cell backgrounds, NO wooden table or outer decorative border).

Art style: Warm, friendly modern Japanese flat pastel illustration style (Irasutoya / Japanese picture dictionary look, crisp clean lines, clear silhouettes, easy to recognize at a glance).

CRITICAL RULE — STRICTLY NO TEXT ANYWHERE:
Zero Japanese kanji, zero hiragana, zero katakana, zero English letters, zero Chinese characters, zero numbers, zero labels, zero signs with words anywhere in any cell! Every signboard, chalkboard, bottle label, ticket, and building facade must be completely text-free.

Exact 20 illustrations in Row-major order (Row 1 top to Row 4 bottom, Left to Right):
Row 1:
- Cell (1,1): <第1词场景描述>
- Cell (1,2): <第2词场景描述>
- Cell (1,3): <第3词场景描述>
- Cell (1,4): <第4词场景描述>
- Cell (1,5): <第5词场景描述>
Row 2:
- Cell (2,1): ...
...
Row 4:
- Cell (4,5): <第20词场景描述>
```

### 场景描述编写经验（防剧透 & 易识别）
- **明确写出空白区域**：遇到黑板、招牌、酒瓶、机器面板时，务必加上 `completely blank ... with NO text or letters`。
- **优先使用视觉特征**：例如「地下」画向下箭头台阶、「医院」画红十字救护标志、「邮局」画信封与红色邮筒、「美术馆」画画框与雕塑，比写文字更利于看图记忆。
- **生成后肉眼检查一遍**：确认 20 个格子的顺序与 `words` 数组完全一致、无错位且无多余文字后再切图。

---

## Step 3：一键切分合集图为 20 张词卡 PNG

项目已内置通用切图脚本 [scripts/slice-word-sheet.py](../scripts/slice-word-sheet.py)，并在 `package.json` 注册了 `slice:cards` 命令。

### 1) 先做空跑检查（确认读出的词 ID 顺序）
```bash
npm run slice:cards -- --deck deck-minna-04 --dry-run
```
如果也传入了 `--input`，还会同时打印检测到的 `X cuts` / `Y cuts` 像素分割线坐标，可检查各行各列间距是否均匀。

### 2) 正式切图输出至 `public/images/words/`
```bash
npm run slice:cards -- --input path/to/generated_sheet.jpg --deck deck-minna-04
```

脚本会自动完成：
- 按列/行灰度像素分布精准定位 `#E2E2E2` 分割线并向内缩进 `7px`（彻底去掉网格灰线）。
- 对纯白底插画自动裁去多余白边，同时保留带室内墙壁/地板背景图的完整画面。
- 等比高质量（`LANCZOS`）居中嵌入统一 `440×360` 白色圆润画布，保存为 `public/images/words/<wordId>.png`。

### 3) 常用可选参数
- **非 5×4 网格**（例如补充 8 个词的 4×2 网格）：
  ```bash
  python scripts/slice-word-sheet.py --input extra.jpg --ids w-a,w-b,w-c,w-d,w-e,w-f,w-g,w-h --cols 4 --rows 2
  ```
- **直接从 ID 列表文件切分**：支持 `--ids-file ids.json`（JSON 数组或每行一个 ID 的文本文件）。

切完后建议抽检四角与中心几张切片（如第 1 格、第 13 格、第 20 格），确保边缘干净无裁剪误差。

---

## Step 4：注册词库、自动化校验与发布

1. 在 [src/data/wordDecks.ts](../src/data/wordDecks.ts) 末尾将新词库加入导出列表：
   ```ts
   export const WORD_DECKS: WordDeck[] = [DECK_MINNA_03, DECK_NEW_PACK];
   ```
   UI 中的卡组切换下拉框、图鉴和熟练度统计面板会自动识别新词库，无需改任何组件代码。

2. 运行全套验证：
   ```bash
   npm run test:spelling   # 自动校验所有 WORD_DECKS 假名合法性、图片存在性(>2KB)及拼写诊断
   npm run test:engine     # 回归测试第一关数词引擎
   npm run build           # TypeScript 类型检查 + Vite 打包到 dist/
   ```

3. 一键发布到 GitHub Pages：
   ```bash
   npm run deploy
   ```
