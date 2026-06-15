const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', '..', 'database', 'db.json');

async function ensureDb() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify({ attempts: [] }, null, 2), 'utf8');
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(dbPath, 'utf8');
  try {
    const data = JSON.parse(raw || '{}');
    return { attempts: Array.isArray(data.attempts) ? data.attempts : [] };
  } catch {
    return { attempts: [] };
  }
}

async function writeDb(data) {
  await ensureDb();
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

async function addAttempt({ word, ideas, aiResult }) {
  const db = await readDb();
  const attempt = {
    id: crypto.randomUUID(),
    word,
    ideas,
    aiResult,
    createdAt: new Date().toISOString()
  };
  db.attempts.unshift(attempt);
  await writeDb(db);
  return attempt;
}

async function getHistory() {
  const db = await readDb();
  return db.attempts;
}

async function getStats() {
  const attempts = await getHistory();
  const scores = attempts
    .map((attempt) => Number(attempt.aiResult && attempt.aiResult.score))
    .filter((score) => Number.isFinite(score));

  const totalAttempts = attempts.length;
  const averageScore = scores.length
    ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1))
    : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;

  return {
    totalAttempts,
    averageScore,
    bestScore,
    lastAttempt: attempts[0] || null
  };
}

module.exports = {
  addAttempt,
  getHistory,
  getStats,
  readDb
};
