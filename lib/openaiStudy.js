import OpenAI from 'openai';
import kuromoji from 'kuromoji';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const OPENAI_ADMIN_MODELS = new Set([
  'gpt-5.4-mini',
  'gpt-5.4',
  'gpt-5.5',
]);

const SELECTIVE_FURIGANA = [
  ['連立方程式', 'れんりつほうていしき'],
  ['三元連立方程式', 'さんげんれんりつほうていしき'],
  ['代入法', 'だいにゅうほう'],
  ['加減法', 'かげんほう'],
  ['未知数', 'みちすう'],
  ['未知', 'みち'],
  ['量', 'りょう'],
  ['免疫不全', 'めんえきふぜん'],
  ['感染経路', 'かんせんけいろ'],
  ['性的接触', 'せいてきせっしょく'],
  ['母子感染', 'ぼしかんせん'],
  ['医薬品', 'いやくひん'],
  ['普及', 'ふきゅう'],
  ['協定', 'きょうてい'],
  ['特許', 'とっきょ'],
  ['公衆衛生', 'こうしゅうえいせい'],
  ['柔軟', 'じゅうなん'],
  ['途上国', 'とじょうこく'],
  ['国際機関', 'こくさいきかん'],
  ['利益', 'りえき'],
  ['優先', 'ゆうせん'],
  ['両立', 'りょうりつ'],
  ['患者', 'かんじゃ'],
  ['治療', 'ちりょう'],
  ['制度', 'せいど'],
  ['薬価', 'やっか'],
  ['最低価格保証', 'さいていかかくほしょう'],
  ['自由貿易', 'じゆうぼうえき'],
  ['先物市場', 'さきものしじょう'],
  ['輸出割当', 'ゆしゅつわりあて'],
  ['多国籍企業', 'たこくせききぎょう'],
  ['中間業者', 'ちゅうかんぎょうしゃ'],
  ['価格暴落', 'かかくぼうらく'],
  ['協同組合', 'きょうどうくみあい'],
  ['専門用語', 'せんもんようご'],
  ['生産者', 'せいさんしゃ'],
  ['消費者', 'しょうひしゃ'],
  ['需要', 'じゅよう'],
  ['供給', 'きょうきゅう'],
  ['経済', 'けいざい'],
  ['貿易', 'ぼうえき'],
  ['輸出', 'ゆしゅつ'],
  ['収入', 'しゅうにゅう'],
  ['格差', 'かくさ'],
  ['企業', 'きぎょう'],
  ['公正', 'こうせい'],
];

const COMMON_PLAIN_WORDS = new Set([
  '学校', '今日', '先生', '大学', '問題', '自分', '家族', '日本', '会社', '勉強',
  '時間', '行く', '見る', '出る', 'する', '人', '時', '年', '月', '日', '本',
  '生', '上', '下', '中', '前', '後', '国', '会', '者', '方', '事', '場', '度',
  '複数', '同時', '目的', '式', '解', '組', '表', '文字', '簡単', '以上', '考え',
  '答え',
]);

const SINGLE_KANJI_ALLOWLIST = new Set(['量', '未知']);

const KUROMOJI_DICT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'node_modules',
  'kuromoji',
  'dict',
);

let tokenizerPromise = null;

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise(resolve => {
      try {
        kuromoji.builder({ dicPath: KUROMOJI_DICT_PATH }).build((err, tokenizer) => {
          if (err || !tokenizer) return resolve(null);
          resolve(tokenizer);
        });
      } catch {
        resolve(null);
      }
    });
  }
  return tokenizerPromise;
}

function countFuriganaMarkup(text = '') {
  return (String(text).match(/【[^|【】]+\|[^|【】]+】|[一-龯々仝〆ヶぁ-んァ-ンー]+【[^【】]+】/g) ?? []).length;
}

function splitMarkupSegments(text = '') {
  const regex = /【([^|【】]+)\|([^|【】]+)】|([一-龯々仝〆ヶぁ-んァ-ンー]+)【([^【】]+)】|《([^《》]+)》|〔([^〔〕]+)〕|｛([^｛｝]+)｝/g;
  const segments = [];
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: text.slice(last, match.index) });
    }
    segments.push({ type: 'markup', value: match[0] });
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) });
  }

  return segments;
}

function hasJapanese(text = '') {
  return /[一-龯々仝〆ヶぁ-んァ-ン]/.test(String(text));
}

function hasKanji(text = '') {
  return /[一-龯々仝〆ヶ]/.test(String(text));
}

function katakanaToHiragana(text = '') {
  return String(text).replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function normalizeLegacyFuriganaInText(text = '') {
  return String(text).replace(/([一-龯々仝〆ヶぁ-んァ-ンー]+)【([^【】]+)】/g, '【$1|$2】');
}

function isLikelyReadingCandidate(surface, reading, token = null) {
  if (!surface || !reading) return false;
  if (!hasKanji(surface)) return false;
  if (/^[A-Za-z0-9.+\-/%％=×÷_]+$/.test(surface)) return false;
  if (/^[ぁ-んァ-ンー]+$/.test(surface)) return false;
  if (COMMON_PLAIN_WORDS.has(surface)) return false;
  if (surface.length <= 1 && !SINGLE_KANJI_ALLOWLIST.has(surface)) return false;
  if (token?.pos && token.pos !== '名詞' && token.pos !== '固有名詞') return false;
  if (token?.pos_detail_1 === '接尾' || token?.pos_detail_1 === '非自立') return false;
  return true;
}

function annotatePlainTextWithTokenizer(text, tokenizer, existingTerms = new Set()) {
  const lines = String(text).split('\n');
  const output = [];

  for (const line of lines) {
    if (!line) {
      output.push('');
      continue;
    }

    const tokens = tokenizer.tokenize(line);
    const rendered = tokens.map(token => {
      const surface = token.surface_form ?? '';
      const reading = token.reading && token.reading !== '*' ? katakanaToHiragana(token.reading) : '';
      if (existingTerms.has(surface)) return surface;
      if (isLikelyReadingCandidate(surface, reading, token)) {
        existingTerms.add(surface);
        return `【${surface}|${reading}】`;
      }
      return surface;
    }).join('');

    output.push(rendered);
  }

  return output.join('\n');
}

function addSelectiveFuriganaToPlainText(text, existingTerms = new Set(), maxAdds = 2) {
  const source = String(text ?? '');
  if (!source) return source;

  const matches = [];
  for (const [term, reading] of SELECTIVE_FURIGANA) {
    if (existingTerms.has(term)) continue;
    const index = source.indexOf(term);
    if (index === -1) continue;
    matches.push({ start: index, end: index + term.length, term, reading, length: term.length });
  }

  if (!matches.length) return source;

  matches.sort((a, b) => a.start - b.start || b.length - a.length);
  const chosen = [];
  let lastEnd = -1;

  for (const match of matches) {
    if (chosen.length >= maxAdds) break;
    if (match.start < lastEnd) continue;
    chosen.push(match);
    lastEnd = match.end;
  }

  if (!chosen.length) return source;

  let out = '';
  let cursor = 0;
  for (const match of chosen) {
    out += source.slice(cursor, match.start);
    out += `【${match.term}|${match.reading}】`;
    existingTerms.add(match.term);
    cursor = match.end;
  }
  out += source.slice(cursor);
  return out;
}

export function ensureSelectiveFurigana(text, maxAdds = 5) {
  const source = String(text ?? '');
  if (!source) return source;

  const segments = splitMarkupSegments(source);
  const existingTerms = new Set();
  let furiganaCount = 0;

  for (const segment of segments) {
    if (segment.type !== 'markup') continue;
    const match = segment.value.match(/^【([^|【】]+)\|([^|【】]+)】$/);
    if (match) {
      existingTerms.add(match[1]);
      furiganaCount += 1;
    }
  }

  const plainText = segments.map(segment => segment.value).join('');
  const length = plainText.replace(/\s+/g, '').length;
  const targetCount = Math.max(0, Math.min(maxAdds, Math.floor(length / 150) + 1));
  if (furiganaCount >= targetCount) return source;

  let remainingAdds = Math.max(0, targetCount - furiganaCount);
  const rebuilt = segments.map(segment => {
    if (segment.type !== 'text') return segment.value;
    const normalizedText = normalizeLegacyFuriganaInText(segment.value);
    const next = addSelectiveFuriganaToPlainText(normalizedText, existingTerms, remainingAdds);
    remainingAdds = Math.max(0, remainingAdds - (countFuriganaMarkup(next) - countFuriganaMarkup(normalizedText)));
    return next;
  }).join('');

  return rebuilt;
}

async function annotateJapaneseText(text) {
  const normalized = normalizeGeneratedText(text);
  if (!hasJapanese(normalized)) return normalized;

  const tokenizer = await getTokenizer();
  if (!tokenizer) return ensureSelectiveFurigana(normalized, 8);

  const seedSegments = splitMarkupSegments(normalized);
  const existingTerms = new Set();

  for (const segment of seedSegments) {
    if (segment.type !== 'markup') continue;
    const match = segment.value.match(/^【([^|【】]+)\|([^|【】]+)】$/);
    if (match) existingTerms.add(match[1]);
  }

  const withDictionary = seedSegments.map(segment => {
    if (segment.type !== 'text') return segment.value;
    const normalizedText = normalizeLegacyFuriganaInText(segment.value);
    return addSelectiveFuriganaToPlainText(normalizedText, existingTerms, 999);
  }).join('');

  const secondPassSegments = splitMarkupSegments(withDictionary);
  const finalExistingTerms = new Set(existingTerms);

  const annotated = secondPassSegments.map(segment => {
    if (segment.type !== 'text') return segment.value;
    return annotatePlainTextWithTokenizer(segment.value, tokenizer, finalExistingTerms);
  }).join('');

  return annotated;
}

function normalizeStepLabel(label) {
  const trimmed = label.trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/^[:：\-—\s]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/^[・•●]\s*/, '');
}

export function normalizeGeneratedText(text) {
  const source = String(text ?? '');
  if (!source) return source;

  const withNewlines = source
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n');

  const lines = withNewlines
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim());

  const normalized = [];
  let previousBlank = false;

  for (let line of lines) {
    if (!line) {
      if (!previousBlank) normalized.push('');
      previousBlank = true;
      continue;
    }
    previousBlank = false;

    line = line.replace(/^(?:Step|STEP|ステップ)\s*(\d+)?\s*[:：\-–—]?\s*(.+)?$/i, (_m, num, label) => {
      const stepLabel = normalizeStepLabel(label ?? '');
      if (num) return stepLabel ? `Step ${num}｜${stepLabel}` : `Step ${num}`;
      return stepLabel ? `Step｜${stepLabel}` : 'Step';
    });

    line = line.replace(/^([•·・\-–—])\s*(.+)$/u, (_m, bullet, content) => `${bullet} ${content.trim()}`);
    normalized.push(line);
  }

  return normalized.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function normalizeTextField(text) {
  return annotateJapaneseText(text);
}

export async function postProcessStudyContent(content) {
  if (!content || typeof content !== 'object') return content;

  const next = { ...content };
  next.summary = await normalizeTextField(next.summary ?? '');
  next.simpleExplanation = await normalizeTextField(next.simpleExplanation ?? '');
  next.illustrationQuery = typeof next.illustrationQuery === 'string'
    ? normalizeGeneratedText(next.illustrationQuery)
    : next.illustrationQuery;
  next.thinkingQuestions = Array.isArray(next.thinkingQuestions)
    ? await Promise.all(next.thinkingQuestions.map(item => normalizeTextField(item)))
    : next.thinkingQuestions;
  next.keyTopics = Array.isArray(next.keyTopics)
    ? await Promise.all(next.keyTopics.map(item => normalizeTextField(item)))
    : next.keyTopics;
  next.corrections = Array.isArray(next.corrections)
    ? await Promise.all(next.corrections.map(async item => ({
        ...item,
        incorrect: await normalizeTextField(item?.incorrect ?? ''),
        correct: await normalizeTextField(item?.correct ?? ''),
        because: await normalizeTextField(item?.because ?? ''),
      })))
    : next.corrections;
  next.flashcards = Array.isArray(next.flashcards)
    ? await Promise.all(next.flashcards.map(async item => ({
        ...item,
        question: await normalizeTextField(item?.question ?? ''),
        answer: await normalizeTextField(item?.answer ?? ''),
      })))
    : next.flashcards;
  next.quiz = Array.isArray(next.quiz)
    ? await Promise.all(next.quiz.map(async item => ({
        ...item,
        question: await normalizeTextField(item?.question ?? ''),
        options: Array.isArray(item?.options)
          ? await Promise.all(item.options.map(option => normalizeTextField(option)))
          : item?.options,
        explanation: await normalizeTextField(item?.explanation ?? ''),
      })))
    : next.quiz;

  if (next.highlightStat && typeof next.highlightStat === 'object') {
    next.highlightStat = {
      ...next.highlightStat,
      label: await normalizeTextField(next.highlightStat.label ?? ''),
      from: await normalizeTextField(next.highlightStat.from ?? ''),
      to: await normalizeTextField(next.highlightStat.to ?? ''),
      magnitude: await normalizeTextField(next.highlightStat.magnitude ?? ''),
    };
  }

  return next;
}

export function resolveOpenAIModel({ adminOverride, isPro }) {
  if (adminOverride && OPENAI_ADMIN_MODELS.has(adminOverride)) return adminOverride;
  return isPro ? 'gpt-5.4' : 'gpt-5.4-mini';
}

export const STUDY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    highlightStat: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            label: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            magnitude: { type: 'string' },
          },
          required: ['label', 'from', 'to', 'magnitude'],
        },
        { type: 'null' },
      ],
    },
    simpleExplanation: { type: 'string' },
    thinkingQuestions: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: { type: 'string' },
    },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          incorrect: { type: 'string' },
          correct: { type: 'string' },
          because: { type: 'string' },
        },
        required: ['incorrect', 'correct', 'because'],
      },
    },
    illustrationQuery: {
      anyOf: [
        { type: 'string' },
        { type: 'null' },
      ],
    },
    keyTopics: {
      type: 'array',
      minItems: 3,
      items: { type: 'string' },
    },
    flashcards: {
      type: 'array',
      minItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['question', 'answer'],
      },
    },
    quiz: {
      type: 'array',
      minItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: { type: 'string' },
          },
          correctIndex: {
            type: 'integer',
            minimum: 0,
            maximum: 3,
          },
          explanation: { type: 'string' },
        },
        required: ['question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: [
    'summary',
    'highlightStat',
    'simpleExplanation',
    'thinkingQuestions',
    'corrections',
    'illustrationQuery',
    'keyTopics',
    'flashcards',
    'quiz',
  ],
};

export function buildStudyPrompt({ language, furigana, hasImage, noteText }) {
  const languageInstruction = language === 'japanese'
    ? `IMPORTANT: Write ALL text values in Japanese (日本語).
This app adds furigana automatically after generation, so do NOT add broad furigana yourself.
Write natural Japanese text only. Keep kanji plain unless a reading is absolutely necessary for a very specialized term.`
    : 'All text values in the JSON must be written in English.';

  const contentDescription = hasImage
    ? 'A student has provided an image of their study material (notes, textbook page, or problem sheet).'
    : `A student has provided the following notes:\n\n${noteText}`;

  return `You are an expert study coach and tutor helping university students — including many international students. ${contentDescription}

${languageInstruction}

Use these color markup tags to make key content stand out:
- 《term》 → RED — the single most critical keyword per section (must-memorize terms)
- 〔concept〕 → ORANGE — important concepts and definitions
- ｛example｝ → BLUE — examples, numbers, or analogies
Apply markup to individual words or short phrases only — never full sentences. Use 2-4 highlights per section.

YOUR MISSION: Help students understand fast — before a quiz. Not a lecture.

Return valid JSON with EXACTLY these keys:
{
  "summary": "Simple one sentence hook.",
  "highlightStat": { "label": "...", "from": "...", "to": "...", "magnitude": "..." },
  "simpleExplanation": "Step 1｜Label\\nOne idea.",
  "thinkingQuestions": ["Short conversational question?", "Real-world framing question?"],
  "corrections": [],
  "illustrationQuery": "search term or null",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "flashcards": [{ "question": "...", "answer": "..." }],
  "quiz": [{ "question": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "One sentence." }]
}

Rules:
- Keep the same markup support: 【漢字|かんじ】, 《term》, 〔concept〕, ｛example｝
- Furigana is a learning aid, not a dictionary. Use it sparingly.
- Prefer readability over coverage.
- Aim for about 5-12 important/difficult furigana terms per generation section when the section is substantial.
- Annotate key academic or specialized terms the first time they appear.
- If the same difficult term appears multiple times, annotate only the first 1-2 occurrences.
- Common everyday words like 学校, 今日, 日本, 先生, 時間, 大学, 行く, 見る, 出る, する should usually stay plain unless the reading is genuinely non-obvious in context.
- Focus furigana on academic terms, technical words, uncommon readings, and vocabulary important for the lesson.
- summary should be compact and clear
- simpleExplanation should be step-by-step
- thinkingQuestions should be casual and natural
- corrections should be empty if nothing is wrong
- illustrationQuery should be one short search term or null
- keyTopics should be concise
- flashcards should be at least 5
- quiz should be at least 4 questions with exactly 4 options each
- Return ONLY the JSON.`;
}

export async function generateStudyMaterial({ apiKey, model, prompt, onProgress }) {
  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.create({
    model,
    input: [{ role: 'user', content: prompt }],
    text: {
      format: {
        type: 'json_schema',
        name: 'study_material',
        strict: true,
        schema: STUDY_SCHEMA,
      },
    },
  });

  onProgress?.(90);
  const outputText =
    response.output_text ??
    response.output?.find(item => item.type === 'message')?.content?.find(part => part.type === 'output_text' || part.type === 'text')?.text ??
    '';

  if (!outputText) throw new Error('OpenAI returned empty output.');
  const parsed = JSON.parse(String(outputText).trim());
  return await postProcessStudyContent(parsed);
}
