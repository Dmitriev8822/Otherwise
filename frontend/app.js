const currentWordEl = document.querySelector('#current-word');
const ideasInput = document.querySelector('#ideas-input');
const messageEl = document.querySelector('#message');
const resultEl = document.querySelector('#result');
const hintEl = document.querySelector('#hint');
const statsEl = document.querySelector('#stats');
const historyEl = document.querySelector('#history');
const newWordBtn = document.querySelector('#new-word-btn');
const timerEl = document.querySelector('#timer');
const checkBtn = document.querySelector('#check-btn');
const hintBtn = document.querySelector('#hint-btn');

let currentWord = '';
let pendingWord = '';
let timerId = null;
const TIMER_SECONDS = 5;

function setMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function ideasFromInput() {
  return ideasInput.value
    .split('\n')
    .map((idea) => idea.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка запроса');
  }
  return data;
}

function setTaskControlsEnabled(isEnabled) {
  checkBtn.disabled = !isEnabled;
  hintBtn.disabled = !isEnabled;
  ideasInput.disabled = !isEnabled;
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function startWordTimer(word) {
  stopTimer();
  currentWord = '';
  pendingWord = word;
  let secondsLeft = TIMER_SECONDS;

  currentWordEl.textContent = '???';
  timerEl.textContent = `Слово появится через ${secondsLeft} сек.`;
  setTaskControlsEnabled(false);

  timerId = setInterval(() => {
    secondsLeft -= 1;

    if (secondsLeft <= 0) {
      stopTimer();
      currentWord = pendingWord;
      pendingWord = '';
      currentWordEl.textContent = currentWord;
      timerEl.textContent = 'Таймер завершён — можно вводить идеи.';
      setTaskControlsEnabled(true);
      setMessage('');
      return;
    }

    timerEl.textContent = `Слово появится через ${secondsLeft} сек.`;
  }, 1000);
}

async function loadWord() {
  stopTimer();
  setTaskControlsEnabled(false);
  setMessage('Загружаем слово...');
  currentWordEl.textContent = '—';
  timerEl.textContent = 'Готовим таймер...';
  const data = await api('/api/word');
  resultEl.classList.add('hidden');
  hintEl.classList.add('hidden');
  startWordTimer(data.word);
  setMessage('Таймер запущен. Слово пока скрыто.');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderResult(attempt) {
  resultEl.innerHTML = `
    <h2>Оценка ИИ</h2>
    <div class="result-grid">
      <div><span class="label">Оценка</span><strong>${attempt.aiResult.score}/10</strong></div>
      <div><span class="label">Разбор</span><p>${escapeHtml(attempt.aiResult.summary)}</p></div>
      <div><span class="label">Сильная сторона</span><p>${escapeHtml(attempt.aiResult.strength)}</p></div>
      <div><span class="label">Совет</span><p>${escapeHtml(attempt.aiResult.advice)}</p></div>
    </div>
  `;
  resultEl.classList.remove('hidden');
}

function renderStats(stats) {
  statsEl.innerHTML = `
    <div class="stat"><span class="label">Заданий</span><strong>${stats.totalAttempts}</strong></div>
    <div class="stat"><span class="label">Средняя оценка</span><strong>${stats.averageScore}</strong></div>
    <div class="stat"><span class="label">Лучшая оценка</span><strong>${stats.bestScore}</strong></div>
    <div class="stat"><span class="label">Последнее слово</span><strong>${stats.lastAttempt ? escapeHtml(stats.lastAttempt.word) : '—'}</strong></div>
  `;
}

function renderHistory(attempts) {
  if (!attempts.length) {
    historyEl.innerHTML = '<p class="message">История пока пустая.</p>';
    return;
  }

  historyEl.innerHTML = attempts.map((attempt) => `
    <article class="history-item">
      <time>${new Date(attempt.createdAt).toLocaleString('ru-RU')}</time>
      <h3>${escapeHtml(attempt.word)} — ${attempt.aiResult.score}/10</h3>
      <ul>${attempt.ideas.map((idea) => `<li>${escapeHtml(idea)}</li>`).join('')}</ul>
      <p>${escapeHtml(attempt.aiResult.summary)}</p>
    </article>
  `).join('');
}

async function refreshDashboard() {
  const [stats, history] = await Promise.all([
    api('/api/stats'),
    api('/api/history')
  ]);
  renderStats(stats);
  renderHistory(history.attempts);
}

async function checkIdeas() {
  const ideas = ideasFromInput();
  if (!currentWord) {
    setMessage('Дождитесь окончания таймера и появления слова.', 'error');
    return;
  }
  if (ideas.length < 3) {
    setMessage('Введите минимум 3 идеи — каждую с новой строки.', 'error');
    return;
  }

  checkBtn.disabled = true;
  setMessage('ИИ проверяет идеи...');
  try {
    const data = await api('/api/check', {
      method: 'POST',
      body: JSON.stringify({ word: currentWord, ideas })
    });
    renderResult(data.attempt);
    await refreshDashboard();
    setMessage('Готово! Результат сохранён в историю.', 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  } finally {
    checkBtn.disabled = false;
  }
}

async function requestHint() {
  if (!currentWord) {
    setMessage('Дождитесь окончания таймера и появления слова.', 'error');
    return;
  }

  hintBtn.disabled = true;
  setMessage('Готовим подсказку...');
  try {
    const data = await api('/api/hint', {
      method: 'POST',
      body: JSON.stringify({ word: currentWord })
    });
    hintEl.innerHTML = `<h2>Подсказка</h2><p>${escapeHtml(data.hint)}</p>`;
    hintEl.classList.remove('hidden');
    setMessage('');
  } catch (error) {
    setMessage(error.message, 'error');
  } finally {
    hintBtn.disabled = false;
  }
}

newWordBtn.addEventListener('click', loadWord);
checkBtn.addEventListener('click', checkIdeas);
hintBtn.addEventListener('click', requestHint);

loadWord().catch((error) => setMessage(error.message, 'error'));
refreshDashboard().catch((error) => setMessage(error.message, 'error'));
