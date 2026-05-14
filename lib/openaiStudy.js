import OpenAI from 'openai';

export const OPENAI_ADMIN_MODELS = new Set([
  'gpt-5.4-mini',
  'gpt-5.4',
  'gpt-5.5',
]);

const SELECTIVE_FURIGANA = [
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

function countFuriganaMarkup(text = '') {
  return (String(text).match(/【[^|【】]+\|[^|【】]+】/g) ?? []).length;
}

function splitMarkupSegments(text = '') {
  const regex = /【([^|【】]+)\|([^|【】]+)】|《([^《》]+)》|〔([^〔〕]+)〕|｛([^｛｝]+)｝/g;
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

function addSelectiveFuriganaToPlainText(text, existingTerms = new Set(), maxAdds = 2) {
  let result = text;
  let added = 0;

  for (const [term, reading] of SELECTIVE_FURIGANA) {
    if (added >= maxAdds || existingTerms.has(term)) continue;
    if (!result.includes(term)) continue;

    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    result = result.replace(rx, `【${term}|${reading}】`);
    existingTerms.add(term);
    added += 1;
  }

  return result;
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
    const next = addSelectiveFuriganaToPlainText(segment.value, existingTerms, remainingAdds);
    remainingAdds = Math.max(0, remainingAdds - (countFuriganaMarkup(next) - countFuriganaMarkup(segment.value)));
    return next;
  }).join('');

  return rebuilt;
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

function normalizeTextField(text) {
  return ensureSelectiveFurigana(normalizeGeneratedText(text), 6);
}

export function postProcessStudyContent(content) {
  if (!content || typeof content !== 'object') return content;

  const next = { ...content };
  next.summary = normalizeTextField(next.summary ?? '');
  next.simpleExplanation = normalizeTextField(next.simpleExplanation ?? '');
  next.illustrationQuery = typeof next.illustrationQuery === 'string'
    ? normalizeGeneratedText(next.illustrationQuery)
    : next.illustrationQuery;
  next.thinkingQuestions = Array.isArray(next.thinkingQuestions)
    ? next.thinkingQuestions.map(item => normalizeTextField(item))
    : next.thinkingQuestions;
  next.keyTopics = Array.isArray(next.keyTopics)
    ? next.keyTopics.map(item => normalizeTextField(item))
    : next.keyTopics;
  next.corrections = Array.isArray(next.corrections)
    ? next.corrections.map(item => ({
        ...item,
        incorrect: normalizeTextField(item?.incorrect ?? ''),
        correct: normalizeTextField(item?.correct ?? ''),
        because: normalizeTextField(item?.because ?? ''),
      }))
    : next.corrections;
  next.flashcards = Array.isArray(next.flashcards)
    ? next.flashcards.map(item => ({
        ...item,
        question: normalizeTextField(item?.question ?? ''),
        answer: normalizeTextField(item?.answer ?? ''),
      }))
    : next.flashcards;
  next.quiz = Array.isArray(next.quiz)
    ? next.quiz.map(item => ({
        ...item,
        question: normalizeTextField(item?.question ?? ''),
        options: Array.isArray(item?.options)
          ? item.options.map(option => normalizeTextField(option))
          : item?.options,
        explanation: normalizeTextField(item?.explanation ?? ''),
      }))
    : next.quiz;

  if (next.highlightStat && typeof next.highlightStat === 'object') {
    next.highlightStat = {
      ...next.highlightStat,
      label: normalizeTextField(next.highlightStat.label ?? ''),
      from: normalizeTextField(next.highlightStat.from ?? ''),
      to: normalizeTextField(next.highlightStat.to ?? ''),
      magnitude: normalizeTextField(next.highlightStat.magnitude ?? ''),
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
    ? (furigana
      ? `IMPORTANT: Write ALL text values in Japanese (日本語).
This app is used by 留学生 so assume limited kanji knowledge.
Add furigana only where it improves learning and readability:
- prioritize difficult, academic, specialized, or uncommon vocabulary
- annotate key terms on first appearance, especially when the term is important to the lesson
- include roughly 5-12 important/difficult terms per generation section when the content is long enough
- do NOT annotate every repeated instance of the same term
- do NOT annotate very common/basic words or repetitive simple kanji
- do NOT try to cover every kanji
Use 【kanji|reading】 only for words that genuinely need support — use 【 and 】 exactly, NOT curly braces.`
      : 'IMPORTANT: All text values in the JSON MUST be written in Japanese (日本語). Write clearly for 留学生.')
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
  return postProcessStudyContent(parsed);
}
