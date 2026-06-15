const fs = require('fs');
const path = require('path');
const { requestOpenAiCompatible } = require('./openrouter');
const { requestLocal } = require('./local');

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');

function loadConfig() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.openrouter.apiKey = process.env.OPENROUTER_API_KEY || config.openrouter.apiKey;
  config.openrouter.baseUrl = process.env.OPENROUTER_BASE_URL || config.openrouter.baseUrl;
  config.openrouter.model = process.env.OPENROUTER_MODEL || config.openrouter.model;
  config.local.baseUrl = process.env.LOCAL_AI_BASE_URL || config.local.baseUrl;
  config.local.model = process.env.LOCAL_AI_MODEL || config.local.model;
  config.aiProvider = process.env.AI_PROVIDER || config.aiProvider;
  return config;
}

function safeEvaluation(word, ideas) {
  const variety = new Set(ideas.map((idea) => idea.split(/\s+/)[0].toLowerCase())).size;
  const avgLength = ideas.join(' ').length / Math.max(ideas.length, 1);
  const score = Math.max(1, Math.min(10, Math.round(5 + Math.min(variety, 3) + Math.min(avgLength / 80, 2))));
  return {
    score,
    summary: `Идеи для слова «${word}» понятны и уже дают несколько направлений применения.`,
    strength: 'Есть несколько самостоятельных вариантов, которые можно развивать дальше.',
    advice: 'Добавь более неожиданные контексты: игру, медицину, космос, обучение или искусство.'
  };
}

function safeHint(word) {
  return {
    hint: `Попробуй представить «${word}» не как обычный предмет, а как инструмент в необычной среде: в школе, больнице, космосе или игре.`
  };
}

async function callProvider(messages, responseShape) {
  const config = loadConfig();
  if (config.aiProvider === 'local') {
    return requestLocal({ config: config.local, messages, responseShape });
  }
  return requestOpenAiCompatible({ config: config.openrouter, messages, responseShape });
}

async function evaluateIdeas(word, ideas) {
  const messages = [
    { role: 'system', content: 'Ты оцениваешь креативность кратко и строго возвращаешь только JSON: score 1-10, summary, strength, advice. Ответ на русском, без markdown.' },
    { role: 'user', content: `Слово: ${word}\nИдеи:\n${ideas.map((idea, index) => `${index + 1}. ${idea}`).join('\n')}` }
  ];

  try {
    return await callProvider(messages, (parsed) => ({
      score: Math.max(1, Math.min(10, Number(parsed.score) || 1)),
      summary: String(parsed.summary || '').slice(0, 400),
      strength: String(parsed.strength || '').slice(0, 300),
      advice: String(parsed.advice || '').slice(0, 300)
    }));
  } catch (error) {
    console.warn(`AI evaluation fallback: ${error.message}`);
    return safeEvaluation(word, ideas);
  }
}

async function getHint(word) {
  const messages = [
    { role: 'system', content: 'Дай короткую подсказку для креативного мышления. Верни только JSON с полем hint. Не давай готовые ответы.' },
    { role: 'user', content: `Слово: ${word}` }
  ];

  try {
    return await callProvider(messages, (parsed) => ({ hint: String(parsed.hint || '').slice(0, 300) }));
  } catch (error) {
    console.warn(`AI hint fallback: ${error.message}`);
    return safeHint(word);
  }
}

module.exports = { evaluateIdeas, getHint };
