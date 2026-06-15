const { callProvider, loadConfig, safeEvaluation } = require('./index');

const DIAGNOSTIC_CASES = [
  {
    label: 'слабые однотипные идеи',
    word: 'кирпич',
    ideas: [
      'положить на полку как груз',
      'использовать как тяжелый предмет',
      'подпереть дверь кирпичом'
    ]
  },
  {
    label: 'средние практичные идеи',
    word: 'зонтик',
    ideas: [
      'сделать мини-теплицу для рассады на балконе',
      'использовать как переносной отражатель света для фотографии',
      'превратить в складную ширму для настольного театра'
    ]
  },
  {
    label: 'сильные разнообразные идеи',
    word: 'ложка',
    ideas: [
      'создать музыкальный интерфейс для реабилитации пальцев после травмы',
      'сделать датчик осадков: капли меняют звук удара по металлу',
      'использовать как игровой контроллер для обучения детей дробям через баланс',
      'превратить в аварийный отражатель сигнала для походов'
    ]
  }
];

function getProviderSnapshot() {
  const config = loadConfig();
  const providerConfig = config[config.aiProvider] || {};
  const isOpenRouterKeyMissing = config.aiProvider === 'openrouter' && (!providerConfig.apiKey || providerConfig.apiKey === 'PASTE_API_KEY_HERE');

  return {
    provider: config.aiProvider,
    model: providerConfig.model || '',
    baseUrl: providerConfig.baseUrl || '',
    apiKeyConfigured: config.aiProvider === 'local' || !isOpenRouterKeyMissing
  };
}

function buildEvaluationMessages(word, ideas) {
  return [
    { role: 'system', content: 'Ты диагностируешь оценку креативности. Верни только JSON: score 1-10, summary, strength, advice. Разные по качеству наборы идей должны получать разные score. Ответ на русском, без markdown.' },
    { role: 'user', content: `Слово: ${word}\nИдеи:\n${ideas.map((idea, index) => `${index + 1}. ${idea}`).join('\n')}` }
  ];
}

function normalizeDiagnosticResponse(parsed) {
  return {
    score: Math.max(1, Math.min(10, Number(parsed.score) || 1)),
    summary: String(parsed.summary || '').slice(0, 400),
    strength: String(parsed.strength || '').slice(0, 300),
    advice: String(parsed.advice || '').slice(0, 300)
  };
}

function analyzeScores(results) {
  const scores = results.map((result) => result.result.score);
  const uniqueScores = new Set(scores);
  const spread = Math.max(...scores) - Math.min(...scores);
  const allFallback = results.every((result) => result.source === 'fallback');
  const allSame = uniqueScores.size === 1;

  let status = 'ok';
  const warnings = [];

  if (allFallback) {
    status = 'error';
    warnings.push('Провайдер ИИ недоступен: все диагностические оценки получены через fallback-алгоритм.');
  } else if (allSame) {
    status = 'error';
    warnings.push('Провайдер ИИ доступен, но вернул одинаковые оценки для разных по качеству наборов идей.');
  } else if (spread < 2) {
    status = 'warning';
    warnings.push('Оценки различаются слабо: разброс меньше 2 баллов. Возможно, модель слишком сглаживает score.');
  }

  return { status, scores, uniqueScores: uniqueScores.size, spread, warnings };
}

async function runAiDiagnostics() {
  const provider = getProviderSnapshot();
  const startedAt = new Date().toISOString();

  const checks = [];
  for (const testCase of DIAGNOSTIC_CASES) {
    const messages = buildEvaluationMessages(testCase.word, testCase.ideas);
    const started = Date.now();

    try {
      const result = await callProvider(messages, normalizeDiagnosticResponse);
      checks.push({
        label: testCase.label,
        word: testCase.word,
        ideasCount: testCase.ideas.length,
        source: 'provider',
        latencyMs: Date.now() - started,
        result
      });
    } catch (error) {
      checks.push({
        label: testCase.label,
        word: testCase.word,
        ideasCount: testCase.ideas.length,
        source: 'fallback',
        latencyMs: Date.now() - started,
        error: error.message,
        result: safeEvaluation(testCase.word, testCase.ideas)
      });
    }
  }

  const analysis = analyzeScores(checks);

  return {
    checkedAt: startedAt,
    provider,
    status: analysis.status,
    summary: {
      scores: analysis.scores,
      uniqueScores: analysis.uniqueScores,
      spread: analysis.spread,
      warnings: analysis.warnings
    },
    checks
  };
}

module.exports = { runAiDiagnostics };
