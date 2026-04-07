const API_URL = 'https://batyn96vwb.execute-api.us-east-1.amazonaws.com/prod';

let fuse = null; // initialized on boot with full movies list

const state = {
  movie: null,
  currentIndex: 0,
  revealed: false,
  guessed: false,
  correct: false,
  loading: false,
  error: null,
  hintsShown: 0,
  seenIds: [],
  selectedDecade: null,
  decadePool: [],
  guessOptions: [],
  hardMode: false
};

const HARD_TIME = 30;
let timerInterval = null;
let timerRemaining = HARD_TIME;

function startTimer() {
  clearInterval(timerInterval);
  timerRemaining = HARD_TIME;
  updateTimerUI();
  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerUI();
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      if (!state.guessed) {
        state.guessed  = true;
        state.correct  = false;
        state.revealed = true;
        if (scoring.getUsername()) scoring.onGuess(false, state.hardMode, state.hintsShown);
        document.querySelectorAll('.guess-btn').forEach(b => {
          b.disabled = true;
          if (b.textContent === state.movie.title) b.classList.add('correct');
        });
        render(state);
      }    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimerUI() {
  const fill  = document.getElementById('timer-fill');
  const label = document.getElementById('timer-label');
  const pct   = (timerRemaining / HARD_TIME) * 100;
  fill.style.width = pct + '%';
  if (timerRemaining > 20) fill.style.background = '#2ecc71';
  else if (timerRemaining > 10) fill.style.background = '#e0a030';
  else fill.style.background = '#e05050';
  label.textContent = `${timerRemaining}s`;
  label.className = timerRemaining <= 10 ? 'urgent' : '';
}

function navigateRight(i, total) { return i < total - 1 ? i + 1 : i; }
function navigateLeft(i) { return i > 0 ? i - 1 : i; }

function buildGuessOptions(movie) {
  const correct = movie.title;
  const similar = (movie.similar_movies || []).slice(0, 3).map(s => s.replace(/\s*\(\d{4}\)\s*$/, ''));
  if (similar.length === 0) return [];
  const options = [correct, ...similar];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

async function fetchDecades() {
  const res = await fetch(`${API_URL}/decades`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchDecadeMovies(decade, excludeIds = []) {
  const params = excludeIds.length ? `?exclude=${excludeIds.join(',')}` : '';
  const res = await fetch(`${API_URL}/movies/decade/${decade}${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchRandomMovie(excludeIds = []) {
  const params = excludeIds.length ? `?exclude=${excludeIds.join(',')}` : '';
  const res = await fetch(`${API_URL}/random-movie${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (!data || !data.title) throw new Error('Malformed API response');
  return data;
}

function render(s) {
  const loadingEl    = document.getElementById('loading-view');
  const errorEl      = document.getElementById('error-view');
  const viewerEl     = document.getElementById('image-viewer');
  const revealEl     = document.getElementById('reveal-panel');
  const actionEl     = document.getElementById('action-bar');
  const hintsEl      = document.getElementById('hints-panel');
  const guessEl      = document.getElementById('guess-panel');
  const hardGuessEl  = document.getElementById('hard-guess-panel');

  const show = el => (el.style.display = 'flex');
  const hide = el => (el.style.display = 'none');

  hide(loadingEl); hide(errorEl); hide(viewerEl); hide(revealEl);
  hide(actionEl); hide(hintsEl); hide(guessEl); hide(hardGuessEl);

  // Timer bar visibility
  const timerBarEl = document.getElementById('timer-bar');
  timerBarEl.style.display = (s.hardMode && !s.loading && s.movie && !s.guessed) ? 'flex' : 'none';

  if (s.loading) { show(loadingEl); return; }

  if (s.error) {
    document.getElementById('error-message').textContent = s.error;
    show(errorEl);
    return;
  }

  if (!s.movie) return;

  const urls  = s.movie.images_to_show || [];
  const total = urls.length;
  const idx   = s.currentIndex;

  // Image viewer
  show(viewerEl);
  const img = document.getElementById('screenshot');
  img.src = urls[idx] || '';
  img.onerror = () => { img.onerror = null; img.src = placeholder(); };
  document.getElementById('counter').textContent = `${idx + 1} / ${total}`;
  document.getElementById('btn-left').disabled  = idx === 0;
  document.getElementById('btn-right').disabled = idx === total - 1;

  // Hints (only before guessing)
  if (!s.guessed && s.hintsShown > 0) {
    show(hintsEl);
    [
      { id: 'hint-year',   valId: 'hint-year-val',   val: s.movie.year },
      { id: 'hint-genres', valId: 'hint-genres-val', val: (s.movie.genres || []).join(', ') },
      { id: 'hint-cast',   valId: 'hint-cast-val',   val: (s.movie.cast || []).join(', ') }
    ].forEach((h, i) => {
      const el = document.getElementById(h.id);
      el.style.display = s.hintsShown > i ? 'flex' : 'none';
      document.getElementById(h.valId).textContent = h.val;
    });
  }

  if (!s.guessed) {
    if (s.hardMode) {
      // Hard mode: free-text search
      show(hardGuessEl);
      const input  = document.getElementById('hard-guess-input');
      const submit = document.getElementById('btn-hard-submit');
      input.disabled  = false;
      submit.disabled = !input.value.trim();
    } else if (s.guessOptions.length > 0) {
      // Normal mode: multiple choice
      show(guessEl);
      const optionsEl = document.getElementById('guess-options');
      if (!optionsEl.hasChildNodes()) {
        s.guessOptions.forEach(title => {
          const btn = document.createElement('button');
          btn.className = 'guess-btn';
          btn.textContent = title;
          btn.addEventListener('click', () => {
            const isCorrect = title === s.movie.title;
            state.guessed  = true;
            state.correct  = isCorrect;
            state.revealed = true;
            stopTimer();
            if (scoring.getUsername()) scoring.onGuess(isCorrect, state.hardMode, state.hintsShown);
            document.querySelectorAll('.guess-btn').forEach(b => {
              b.disabled = true;
              if (b.textContent === s.movie.title) b.classList.add('correct');
              else if (b.textContent === title && !isCorrect) b.classList.add('wrong');
            });
            render(state);
          });
          optionsEl.appendChild(btn);
        });
      }
      show(guessEl);
    }
  }

  // Reveal panel (after guessing)
  if (s.revealed) {
    document.getElementById('timer-bar').style.display = 'none';
    show(revealEl);
    document.getElementById('reveal-title').textContent    = (s.correct ? '✅ ' : '❌ ') + s.movie.title;
    document.getElementById('reveal-meta').textContent     = `${s.movie.year} · ${(s.movie.genres || []).join(', ')}`;
    document.getElementById('reveal-synopsis').textContent = s.movie.synopsis || '';
    document.getElementById('reveal-cast').textContent     = s.movie.cast ? 'Cast: ' + s.movie.cast.join(', ') : '';
  }

  // Action bar
  show(actionEl);
  const allHintsShown = s.hintsShown >= 3;
  document.getElementById('btn-hint').style.display = (s.guessed || allHintsShown) ? 'none' : '';
  document.getElementById('btn-hint').textContent   = `Show Hint (${s.hintsShown + 1}/3)`;
  document.getElementById('btn-skip').style.display = s.guessed ? 'none' : '';
  document.getElementById('btn-new').style.display  = s.guessed ? '' : 'none';
}

function submitHardGuess() {
  const input = document.getElementById('hard-guess-input');
  const guess = input.value.trim();
  if (!guess || state.guessed) return;
  const isCorrect = guess.toLowerCase() === state.movie.title.toLowerCase();
  state.guessed  = true;
  state.correct  = isCorrect;
  state.revealed = true;
  stopTimer();
  if (scoring.getUsername()) scoring.onGuess(isCorrect, state.hardMode, state.hintsShown);
  input.disabled = true;
  document.getElementById('btn-hard-submit').disabled = true;
  render(state);
}

function placeholder() {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' fill='%23666' font-size='20' text-anchor='middle' dominant-baseline='middle'%3EImage unavailable%3C/text%3E%3C/svg%3E";
}

async function loadMovie() {
  state.loading      = true;
  state.error        = null;
  state.movie        = null;
  state.currentIndex = 0;
  state.revealed     = false;
  state.guessed      = false;
  state.correct      = false;
  state.hintsShown   = 0;
  state.guessOptions = [];
  document.getElementById('guess-options').innerHTML = '';
  // Reset hard mode search
  const hardInput = document.getElementById('hard-guess-input');
  hardInput.value = '';
  hardInput.disabled = false;
  document.getElementById('btn-hard-submit').disabled = true;
  document.getElementById('search-dropdown').style.display = 'none';
  render(state);
  try {
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      if (state.selectedDecade) {
        if (state.decadePool.length === 0) {
          const data = await fetchDecadeMovies(state.selectedDecade, state.seenIds);
          state.decadePool = data.movies || [];
        }
        if (state.decadePool.length === 0) throw new Error('No more movies in this decade.');
        state.movie = state.decadePool.shift();
      } else {
        state.movie = await fetchRandomMovie(state.seenIds);
      }
      if (state.movie.movie_id) state.seenIds.push(state.movie.movie_id);
      // Skip movies with no screenshots
      const urls = state.movie.images_to_show || [];
      if (urls.length > 0) break;
      state.movie = null;
    }
    if (!state.movie) throw new Error('No movies with screenshots found.');
    state.guessOptions = buildGuessOptions(state.movie);
  } catch (e) {
    state.error = e.message || 'Failed to load movie.';
  } finally {
    state.loading = false;
  }
  render(state);
  if (state.hardMode && state.movie && !state.error) startTimer();
  if (state.movie && !state.error && scoring.getUsername()) scoring.onNewRound(state.hardMode);
}

function selectDecade(decade) {
  state.selectedDecade = decade;
  state.seenIds = [];
  state.decadePool = [];
  document.querySelectorAll('.decade-pill').forEach(p => {
    p.classList.toggle('active', (p.dataset.decade === '' && decade === null) || p.dataset.decade == decade);
  });
  loadMovie();
}

async function boot() {
  scoring.init();

  // Fetch full movies list for hard mode fuzzy search
  try {
    const titles = await fetch(`${API_URL}/movies-list`).then(r => r.json());
    const raw = Array.isArray(titles) ? titles : (titles.titles || titles.movies || []);
    // Handle both flat strings and objects
    const items = raw.map(t => typeof t === 'string' ? { title: t } : t);
    fuse = new Fuse(items, { keys: ['title'], threshold: 0.35, distance: 100 });
  } catch (e) {
    console.error('[boot] movies-list failed:', e);
  }

  // Wire up hard mode search input
  const input    = document.getElementById('hard-guess-input');
  const dropdown = document.getElementById('search-dropdown');
  const submit   = document.getElementById('btn-hard-submit');
  let activeIdx  = -1;

  function closeDropdown() {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    activeIdx = -1;
  }

  function selectSuggestion(title) {
    input.value = title;
    submit.disabled = false;
    closeDropdown();
    input.focus();
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    submit.disabled = !q;
    if (!q || !fuse) { closeDropdown(); return; }
    const results = fuse.search(q, { limit: 8 });
    if (!results.length) { closeDropdown(); return; }
    dropdown.innerHTML = '';
    activeIdx = -1;
    results.forEach(({ item }) => {
      const div = document.createElement('div');
      div.className = 'search-item';
      div.textContent = item.title;
      div.addEventListener('mousedown', (e) => { e.preventDefault(); selectSuggestion(item.title); });
      dropdown.appendChild(div);
    });
    dropdown.style.display = 'block';
  });

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.search-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, -1);
      items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && items[activeIdx]) {
        selectSuggestion(items[activeIdx].textContent);
      } else if (input.value.trim()) {
        submitHardGuess();
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  input.addEventListener('blur', () => setTimeout(closeDropdown, 150));

  submit.addEventListener('click', submitHardGuess);

  // Fetch decades
  try {
    const data = await fetchDecades();
    const pillsEl = document.getElementById('decade-pills');
    (data.decades || []).sort((a, b) => a.decade - b.decade).forEach(({ decade, count }) => {
      const btn = document.createElement('button');
      btn.className = 'decade-pill';
      btn.dataset.decade = decade;
      btn.textContent = `${decade}s`;
      btn.title = `${count} movies`;
      btn.addEventListener('click', () => selectDecade(decade));
      pillsEl.appendChild(btn);
    });
    pillsEl.querySelector('[data-decade=""]').addEventListener('click', () => selectDecade(null));
    document.getElementById('decade-bar').style.display = 'block';
  } catch (e) { /* non-fatal */ }

  loadMovie();
}

document.getElementById('btn-normal-mode').addEventListener('click', () => {
  if (state.hardMode) {
    state.hardMode = false;
    stopTimer();
    document.getElementById('btn-normal-mode').classList.add('active');
    document.getElementById('btn-hard-mode').classList.remove('active');
    document.getElementById('timer-bar').style.display = 'none';
  }
});
document.getElementById('btn-hard-mode').addEventListener('click', () => {
  if (!state.hardMode) {
    state.hardMode = true;
    document.getElementById('btn-hard-mode').classList.add('active');
    document.getElementById('btn-normal-mode').classList.remove('active');
    loadMovie();
  }
});

document.getElementById('btn-left').addEventListener('click', () => {
  state.currentIndex = navigateLeft(state.currentIndex);
  render(state);
});
document.getElementById('btn-right').addEventListener('click', () => {
  state.currentIndex = navigateRight(state.currentIndex, (state.movie?.images_to_show || []).length);
  render(state);
});
document.getElementById('btn-hint').addEventListener('click', () => {
  if (state.hintsShown < 3) {
    state.hintsShown++;
    if (scoring.getUsername()) scoring.onHint(state.hardMode, state.hintsShown);
    render(state);
  }
});
document.getElementById('btn-skip').addEventListener('click', () => { stopTimer(); loadMovie(); });
document.getElementById('btn-new').addEventListener('click', () => { stopTimer(); loadMovie(); });
document.getElementById('btn-retry').addEventListener('click', () => { stopTimer(); loadMovie(); });

document.addEventListener('keydown', (e) => {
  if (!state.movie || state.loading) return;
  const total = (state.movie.images_to_show || []).length;
  if (e.key === 'ArrowRight') { state.currentIndex = navigateRight(state.currentIndex, total); render(state); }
  else if (e.key === 'ArrowLeft') { state.currentIndex = navigateLeft(state.currentIndex); render(state); }
});

boot();
