const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { evaluateIdeas, getHint } = require('./ai');
const { runAiDiagnostics } = require('./ai/diagnostics');
const { addAttempt, getHistory, getStats } = require('./db/jsonDb');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, '..', 'frontend');
const wordsPath = path.join(__dirname, '..', 'data', 'words.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(frontendPath));

function parseIdeas(rawIdeas) {
  if (Array.isArray(rawIdeas)) {
    return rawIdeas.map(String).map((idea) => idea.trim()).filter(Boolean);
  }
  if (typeof rawIdeas === 'string') {
    return rawIdeas.split(/\n+/).map((idea) => idea.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean);
  }
  return [];
}

async function readWords() {
  const raw = await fs.readFile(wordsPath, 'utf8');
  const words = JSON.parse(raw).filter(Boolean);
  if (!words.length) {
    throw new Error('words.json is empty');
  }
  return words;
}

app.get('/api/word', async (_req, res, next) => {
  try {
    const words = await readWords();
    const word = words[Math.floor(Math.random() * words.length)];
    res.json({ word });
  } catch (error) {
    next(error);
  }
});

app.post('/api/check', async (req, res, next) => {
  try {
    const word = String(req.body.word || '').trim();
    const ideas = parseIdeas(req.body.ideas);

    if (!word) {
      return res.status(400).json({ error: 'Нужно получить или указать слово.' });
    }
    if (ideas.length < 3) {
      return res.status(400).json({ error: 'Введите минимум 3 идеи.' });
    }

    const aiResult = await evaluateIdeas(word, ideas);
    const attempt = await addAttempt({ word, ideas, aiResult });
    res.json({ attempt });
  } catch (error) {
    next(error);
  }
});

app.post('/api/hint', async (req, res, next) => {
  try {
    const word = String(req.body.word || '').trim();
    if (!word) {
      return res.status(400).json({ error: 'Нужно получить или указать слово.' });
    }
    res.json(await getHint(word));
  } catch (error) {
    next(error);
  }
});

app.get('/api/history', async (_req, res, next) => {
  try {
    res.json({ attempts: await getHistory() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/stats', async (_req, res, next) => {
  try {
    res.json(await getStats());
  } catch (error) {
    next(error);
  }
});

app.get('/api/ai/diagnostics', async (_req, res, next) => {
  try {
    res.json(await runAiDiagnostics());
  } catch (error) {
    next(error);
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
});

app.listen(PORT, () => {
  console.log(`Иначе запущен: http://localhost:${PORT}`);
});
