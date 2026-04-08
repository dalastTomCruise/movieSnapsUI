/**
 * score.js — Scoring, username, and leaderboard logic.
 *
 * Scoring rules:
 *   Normal correct: 20 pts, minus 5 per hint used
 *   Hard correct:   40 pts, minus 5 per hint used
 *   Wrong guess:   -10 pts
 *   Total score never goes below 0
 */

const scoring = (() => {
  const SCORE_KEY = 'movieGameScore';
  const DATE_KEY  = 'movieGameScoreDate';
  const USER_KEY  = 'movieGameUsername';
  const NORMAL_BASE = 20;
  const HARD_BASE   = 40;
  const HINT_PENALTY = 5;
  const WRONG_PENALTY = 10;

  function todayUTC() { return new Date().toISOString().slice(0, 10); }

  // Reset local score if it's a new day
  if (localStorage.getItem(DATE_KEY) !== todayUTC()) {
    localStorage.setItem(SCORE_KEY, '0');
    localStorage.setItem(DATE_KEY, todayUTC());
  }

  let totalScore = parseInt(localStorage.getItem(SCORE_KEY) || '0', 10);
  let username   = localStorage.getItem(USER_KEY) || '';

  // DOM refs
  let elScLogin, elScLogged, elScTotal, elScUsername;
  let elRoundPts, elRoundResult;
  let elUsernameInput, elBtnSet, elBtnChange;
  let elLeaderboardList;

  function init() {
    elScLogin        = document.getElementById('sc-login');
    elScLogged       = document.getElementById('sc-logged');
    elScTotal        = document.getElementById('sc-total');
    elScUsername     = document.getElementById('sc-username');
    elRoundPts       = document.getElementById('round-points-display');
    elRoundResult    = document.getElementById('round-result-display');
    elUsernameInput  = document.getElementById('username-input');
    elBtnSet         = document.getElementById('btn-set-username');
    elBtnChange      = document.getElementById('btn-change-username');
    elLeaderboardList = document.getElementById('leaderboard-list');

    if (username) showLoggedIn();

    elBtnSet.addEventListener('click', setUsername);
    elUsernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') setUsername(); });
    elBtnChange.addEventListener('click', () => {
      username = '';
      localStorage.removeItem(USER_KEY);
      elUsernameInput.value = '';
      elScLogin.style.display = 'flex';
      elScLogged.style.display = 'none';
    });

    renderScore();
    syncAndFetchLeaderboard();
  }

  function setUsername() {
    const val = (elUsernameInput.value || '').trim().slice(0, 20);
    if (!val) return;
    username = val;
    localStorage.setItem(USER_KEY, username);
    showLoggedIn();
  }

  function showLoggedIn() {
    elScLogin.style.display = 'none';
    elScLogged.style.display = 'flex';
    elScUsername.textContent = username;
    renderScore();
  }

  function getUsername() { return username; }

  function potentialPoints(hardMode, hintsUsed) {
    const base = hardMode ? HARD_BASE : NORMAL_BASE;
    return Math.max(0, base - hintsUsed * HINT_PENALTY);
  }

  function onHint(hardMode, hintsUsed) {
    const pts = potentialPoints(hardMode, hintsUsed);
    elRoundPts.textContent = pts;
    elRoundPts.classList.toggle('deducted', hintsUsed > 0);
    elRoundResult.textContent = '';
  }

  function onNewRound(hardMode) {
    const pts = potentialPoints(hardMode, 0);
    elRoundPts.textContent = pts;
    elRoundPts.classList.remove('deducted');
    elRoundResult.textContent = '';
  }

  function onGuess(correct, hardMode, hintsUsed) {
    let delta;
    if (correct) {
      delta = potentialPoints(hardMode, hintsUsed);
    } else {
      delta = -WRONG_PENALTY;
    }
    totalScore = Math.max(0, totalScore + delta);
    localStorage.setItem(SCORE_KEY, totalScore);
    renderScore();

    if (correct) {
      elRoundResult.textContent = ` +${delta}`;
      elRoundResult.className = 'pts-gained';
    } else {
      elRoundResult.textContent = ` ${delta}`;
      elRoundResult.className = 'pts-lost';
    }

    if (username) {
      submitScoreAndSync().then(() => fetchLeaderboard());
    }

    return delta;
  }

  function renderScore() {
    if (elScTotal) elScTotal.textContent = totalScore;
  }

  /** POST score to backend, read back the confirmed value, and sync local state. */
  async function submitScoreAndSync() {
    if (!username) return;
    try {
      const res = await fetch(`${API_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, score: totalScore })
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.score === 'number') {
          totalScore = data.score;
          localStorage.setItem(SCORE_KEY, totalScore);
          renderScore();
        }
      }
    } catch (e) { /* silent */ }
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch(`${API_URL}/leaderboard`);
      if (!res.ok) return;
      const data = await res.json();
      const entries = data.leaderboard || [];
      renderLeaderboard(entries);
      // Sync local score with backend
      syncScoreFromLeaderboard(entries);
    } catch (e) { /* silent */ }
  }

  /** Pull the user's score from the leaderboard and update localStorage to match. */
  function syncScoreFromLeaderboard(entries) {
    if (!username) return;
    const me = entries.find(e => e.username.toLowerCase() === username.toLowerCase());
    if (me) {
      totalScore = me.score;
    } else {
      // User not on leaderboard — backend has no score for today, reset local
      totalScore = 0;
    }
    localStorage.setItem(SCORE_KEY, totalScore);
    localStorage.setItem(DATE_KEY, todayUTC());
    renderScore();
  }

  /** Convenience: sync + render leaderboard in one call (used on init). */
  async function syncAndFetchLeaderboard() {
    await fetchLeaderboard();
  }

  function renderLeaderboard(entries) {
    if (!elLeaderboardList) return;
    if (!entries.length) {
      elLeaderboardList.innerHTML = '<div class="lb-empty">No scores yet today</div>';
      return;
    }
    elLeaderboardList.innerHTML = entries.map((e, i) => {
      const isMe = username && e.username.toLowerCase() === username.toLowerCase();
      return `<div class="lb-row">
        <span class="lb-rank">${i + 1}.</span>
        <span class="lb-name${isMe ? ' me' : ''}">${escHtml(e.username)}</span>
        <span class="lb-score">${e.score}</span>
      </div>`;
    }).join('');
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  return { init, getUsername, potentialPoints, onHint, onNewRound, onGuess, fetchLeaderboard };
})();
