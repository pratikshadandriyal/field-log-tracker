/* ==========================================================================
   Field Log — task tracker logic
   Data model per task:
   { id, text, category, priority, dueDate (or null), createdAt (ISO), completedAt (ISO or null) }
   Persisted in localStorage under 'fieldlog_tasks'
   ========================================================================== */

const STORAGE_KEY = 'fieldlog_tasks';

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Could not read saved tasks', e);
    return [];
  }
}

function saveTasks(t) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

let tasks = loadTasks();
let filterState = { search: '', category: 'All', priority: 'All' };

/* ---------- Date helpers ---------- */

function dayKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayKey() { return dayKey(new Date()); }

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ---------- Theme toggle ---------- */

const THEME_KEY = 'fieldlog_theme';
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggle').textContent = '☀️ Light';
  } else {
    document.body.removeAttribute('data-theme');
    document.getElementById('themeToggle').textContent = '🌙 Dark';
  }
}
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
applyTheme(savedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  if (document.getElementById('panel-analytics').classList.contains('active')) renderTrendChart();
});

/* ---------- Tabs ---------- */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'analytics') renderAnalytics();
  });
});

/* ---------- Header date ---------- */

document.getElementById('todayDate').textContent =
  new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/* ---------- Add task ---------- */

document.getElementById('addBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  const category = document.getElementById('categoryInput').value;
  const priority = document.getElementById('priorityInput').value;
  const due = document.getElementById('dueInput').value || null;

  tasks.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    category,
    priority,
    dueDate: due,
    createdAt: new Date().toISOString(),
    completedAt: null
  });
  saveTasks(tasks);
  input.value = '';
  document.getElementById('dueInput').value = '';
  renderTasks();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.completedAt = t.completedAt ? null : new Date().toISOString();
  saveTasks(tasks);
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);
  renderTasks();
}

function startEdit(id, textEl) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-edit-input';
  input.value = t.text;
  input.maxLength = 120;
  textEl.replaceWith(input);
  input.focus();
  input.select();

  function commit() {
    const newText = input.value.trim();
    if (newText) {
      t.text = newText;
      saveTasks(tasks);
    }
    renderTasks();
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') renderTasks();
  });
  input.addEventListener('blur', commit);
}

/* ---------- Search / filter ---------- */

document.getElementById('searchInput').addEventListener('input', e => {
  filterState.search = e.target.value.toLowerCase();
  renderTasks();
});
document.getElementById('filterCategory').addEventListener('change', e => {
  filterState.category = e.target.value;
  renderTasks();
});
document.getElementById('filterPriority').addEventListener('change', e => {
  filterState.priority = e.target.value;
  renderTasks();
});

function applyFilter(list) {
  return list.filter(t => {
    if (filterState.search && !t.text.toLowerCase().includes(filterState.search)) return false;
    if (filterState.category !== 'All' && t.category !== filterState.category) return false;
    if (filterState.priority !== 'All' && (t.priority || 'Medium') !== filterState.priority) return false;
    return true;
  });
}

/* ---------- Render: Today tab ---------- */

const CATEGORY_CLASS = { Work: 'tag-work', Personal: 'tag-personal', Learning: 'tag-learning', Other: 'tag-other' };

function taskRow(t) {
  const li = document.createElement('li');
  li.className = 'task-item' + (t.completedAt ? ' completed' : '');

  const check = document.createElement('button');
  check.className = 'task-check' + (t.completedAt ? ' checked' : '');
  check.setAttribute('aria-label', 'Toggle complete');
  check.addEventListener('click', () => toggleTask(t.id));

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = t.text;

  const priorityTag = document.createElement('span');
  priorityTag.className = 'tag priority-' + (t.priority || 'Medium');
  priorityTag.textContent = t.priority || 'Medium';

  const tag = document.createElement('span');
  tag.className = 'tag ' + (CATEGORY_CLASS[t.category] || 'tag-other');
  tag.textContent = t.category;

  li.appendChild(check);
  li.appendChild(text);
  li.appendChild(priorityTag);
  li.appendChild(tag);

  if (t.dueDate && !t.completedAt) {
    const due = document.createElement('span');
    due.className = 'due-tag';
    due.textContent = 'due ' + t.dueDate;
    li.appendChild(due);
  }

  const edit = document.createElement('button');
  edit.className = 'edit-btn';
  edit.textContent = '✎';
  edit.setAttribute('aria-label', 'Edit task');
  edit.addEventListener('click', () => startEdit(t.id, text));
  li.appendChild(edit);

  const del = document.createElement('button');
  del.className = 'delete-btn';
  del.textContent = '✕';
  del.setAttribute('aria-label', 'Delete task');
  del.addEventListener('click', () => deleteTask(t.id));
  li.appendChild(del);

  return li;
}

function renderTasks() {
  const openList = document.getElementById('openList');
  const doneList = document.getElementById('doneList');
  openList.innerHTML = '';
  doneList.innerHTML = '';

  const open = applyFilter(tasks.filter(t => !t.completedAt));
  const doneToday = applyFilter(tasks.filter(t => t.completedAt && t.completedAt.slice(0, 10) === todayKey()));

  if (open.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    if (tasks.length === 0) {
      empty.innerHTML = "Nothing logged yet. Add a task above, or ";
      const btn = document.createElement('button');
      btn.className = 'sample-data-btn';
      btn.textContent = 'Load sample data';
      btn.addEventListener('click', generateSampleData);
      empty.appendChild(document.createElement('br'));
      empty.appendChild(btn);
    } else {
      empty.textContent = 'No open tasks match this filter.';
    }
    openList.appendChild(empty);
  } else {
    open.forEach(t => openList.appendChild(taskRow(t)));
  }

  if (doneToday.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No completions logged yet today.';
    doneList.appendChild(empty);
  } else {
    doneToday.forEach(t => doneList.appendChild(taskRow(t)));
  }

  document.getElementById('openCount').textContent = open.length;
  document.getElementById('doneCount').textContent = doneToday.length;
  renderUpcoming();
}

function computeUpcoming() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return tasks
    .filter(t => !t.completedAt && t.dueDate)
    .map(t => {
      const due = new Date(t.dueDate + 'T00:00:00');
      const diffDays = Math.round((due - now) / (1000 * 60 * 60 * 24));
      return { task: t, diffDays };
    })
    .filter(x => x.diffDays <= 7)
    .sort((a, b) => a.diffDays - b.diffDays);
}

function upcomingLabel(diffDays) {
  if (diffDays < 0) return { text: `Overdue ${Math.abs(diffDays)}d`, cls: 'upcoming-overdue' };
  if (diffDays === 0) return { text: 'Due today', cls: 'upcoming-today' };
  if (diffDays === 1) return { text: 'Tomorrow', cls: 'upcoming-soon' };
  return { text: `In ${diffDays}d`, cls: 'upcoming-soon' };
}

function renderUpcoming() {
  const list = document.getElementById('upcomingList');
  list.innerHTML = '';
  const upcoming = computeUpcoming();
  document.getElementById('upcomingCount').textContent = upcoming.length;
  if (upcoming.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Nothing due in the next 7 days.';
    list.appendChild(empty);
    return;
  }
  upcoming.forEach(({ task: t, diffDays }) => {
    const li = document.createElement('li');
    li.className = 'task-item';
    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = t.text;
    const tag = document.createElement('span');
    tag.className = 'tag ' + (CATEGORY_CLASS[t.category] || 'tag-other');
    tag.textContent = t.category;
    const { text: labelText, cls } = upcomingLabel(diffDays);
    const badge = document.createElement('span');
    badge.className = 'upcoming-badge ' + cls;
    badge.textContent = labelText;
    li.appendChild(text);
    li.appendChild(tag);
    li.appendChild(badge);
    list.appendChild(li);
  });
}

/* ---------- Analytics ---------- */

function computeStreak() {
  const completedDays = new Set(
    tasks.filter(t => t.completedAt).map(t => t.completedAt.slice(0, 10))
  );
  let streak = 0;
  let cursor = new Date();
  if (!completedDays.has(todayKey())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeCompletionRate() {
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => t.completedAt).length;
  return Math.round((done / tasks.length) * 100);
}

function computeCategoryRates() {
  const cats = ['Work', 'Personal', 'Learning', 'Other'];
  return cats.map(cat => {
    const inCat = tasks.filter(t => t.category === cat);
    const done = inCat.filter(t => t.completedAt).length;
    const pct = inCat.length ? Math.round((done / inCat.length) * 100) : 0;
    return { cat, pct, total: inCat.length };
  }).filter(r => r.total > 0);
}

function computePriorityRates() {
  const levels = ['High', 'Medium', 'Low'];
  return levels.map(p => {
    const inP = tasks.filter(t => (t.priority || 'Medium') === p);
    const done = inP.filter(t => t.completedAt).length;
    const pct = inP.length ? Math.round((done / inP.length) * 100) : 0;
    return { level: p, pct, total: inP.length };
  }).filter(r => r.total > 0);
}

function computeBestWeekday() {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  tasks.filter(t => t.completedAt).forEach(t => {
    const d = new Date(t.completedAt);
    counts[d.getDay()]++;
  });
  const max = Math.max(...counts);
  if (max === 0) return '—';
  return WEEKDAY_NAMES[counts.indexOf(max)];
}

function computeDailyCounts(days) {
  const counts = {};
  tasks.filter(t => t.completedAt).forEach(t => {
    const k = t.completedAt.slice(0, 10);
    counts[k] = (counts[k] || 0) + 1;
  });
  const out = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const k = dayKey(cursor);
    out.push({ key: k, count: counts[k] || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function computeWeeklySummary() {
  const now = new Date();
  const inRange = (t, startOffset, endOffset) => {
    if (!t.completedAt) return false;
    const d = new Date(t.completedAt);
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    return diffDays >= startOffset && diffDays <= endOffset;
  };
  const thisWeek = tasks.filter(t => inRange(t, 0, 6));
  const lastWeek = tasks.filter(t => inRange(t, 7, 13));

  if (thisWeek.length === 0) {
    return { html: 'No tasks completed this week yet — get started to build your first summary.' };
  }

  const catCounts = {};
  thisWeek.forEach(t => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
  const topCategory = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0];

  let changeHtml = '';
  if (lastWeek.length > 0) {
    const change = Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100);
    if (change > 0) changeHtml = `, <span class="summary-up">up ${change}%</span> from last week`;
    else if (change < 0) changeHtml = `, <span class="summary-down">down ${Math.abs(change)}%</span> from last week`;
    else changeHtml = ', same pace as last week';
  }

  return { html: `<strong>${thisWeek.length}</strong> task${thisWeek.length === 1 ? '' : 's'} completed this week${changeHtml}. <strong>${topCategory}</strong> led with ${catCounts[topCategory]} completion${catCounts[topCategory] === 1 ? '' : 's'}.` };
}

function renderHeatmap() {
  const wrap = document.getElementById('heatmap');
  wrap.innerHTML = '';
  const days = computeDailyCounts(84);
  const max = Math.max(1, ...days.map(d => d.count));
  days.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'heat-cell';
    if (d.count > 0) {
      const intensity = d.count / max;
      cell.style.background = mixColor('#D8DBD6', '#2F6F62', intensity);
    }
    cell.title = `${d.key}: ${d.count} completed`;
    wrap.appendChild(cell);
  });
}

function mixColor(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16)
  };
}

function renderCategoryBars() {
  const box = document.getElementById('categoryBars');
  box.innerHTML = '';
  const rates = computeCategoryRates();
  if (rates.length === 0) {
    box.innerHTML = '<div class="empty-state">Add a few tasks to see category breakdown.</div>';
    return;
  }
  rates.forEach(r => {
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = `
      <span class="cat-name">${r.cat}</span>
      <span class="cat-track"><span class="cat-fill" style="width:${r.pct}%"></span></span>
      <span class="cat-pct">${r.pct}%</span>
    `;
    box.appendChild(row);
  });
}

function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 160 * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, 160);

  const data = computeDailyCounts(14);
  const max = Math.max(1, ...data.map(d => d.count));
  const padding = 20;
  const w = rect.width - padding * 2;
  const h = 160 - padding * 2;
  const stepX = w / (data.length - 1);

  ctx.strokeStyle = '#D8DBD6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, 160 - padding);
  ctx.lineTo(padding + w, 160 - padding);
  ctx.stroke();

  ctx.strokeStyle = '#2F6F62';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = padding + i * stepX;
    const y = padding + h - (d.count / max) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#2F6F62';
  data.forEach((d, i) => {
    const x = padding + i * stepX;
    const y = padding + h - (d.count / max) * h;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function generateInsights() {
  const box = document.getElementById('insights');
  box.innerHTML = '';
  const notes = [];

  const rates = computeCategoryRates();
  if (rates.length >= 2) {
    const sorted = [...rates].sort((a, b) => b.pct - a.pct);
    const best = sorted[0], worst = sorted[sorted.length - 1];
    if (best.pct !== worst.pct) {
      notes.push(`${best.cat} is your most consistent category at ${best.pct}% completion, versus ${worst.pct}% for ${worst.cat}.`);
    }
  }

  const priorityRates = computePriorityRates();
  const highRate = priorityRates.find(r => r.level === 'High');
  const lowRate = priorityRates.find(r => r.level === 'Low');
  if (highRate && lowRate && highRate.total >= 2 && lowRate.total >= 2) {
    if (highRate.pct > lowRate.pct) {
      notes.push(`You complete ${highRate.pct}% of High priority tasks versus ${lowRate.pct}% of Low priority ones — you're prioritizing correctly.`);
    } else if (lowRate.pct > highRate.pct) {
      notes.push(`Low priority tasks get finished more often (${lowRate.pct}%) than High priority ones (${highRate.pct}%) — worth a second look at what's actually urgent.`);
    }
  }

  const doneTasks = tasks.filter(t => t.completedAt);
  if (doneTasks.length >= 5) {
    let weekday = 0, weekend = 0;
    doneTasks.forEach(t => {
      const day = new Date(t.completedAt).getDay();
      if (day === 0 || day === 6) weekend++; else weekday++;
    });
    if (weekday > 0 && weekend > 0) {
      const total = weekday + weekend;
      notes.push(`${Math.round((weekday / total) * 100)}% of your completed tasks happen on weekdays.`);
    }
  }

  const bestDay = computeBestWeekday();
  if (bestDay !== '—' && doneTasks.length >= 5) {
    notes.push(`${bestDay} is the day you close out the most tasks.`);
  }

  if (notes.length === 0) {
    box.innerHTML = '<div class="empty-state">Complete a handful of tasks across a few days to unlock patterns here.</div>';
    return;
  }

  notes.slice(0, 4).forEach(n => {
    const div = document.createElement('div');
    div.className = 'insight-box';
    div.textContent = n;
    box.appendChild(div);
  });
}

function renderAnalytics() {
  document.getElementById('statStreak').textContent = computeStreak();
  document.getElementById('statCompletion').textContent = computeCompletionRate() + '%';
  document.getElementById('statTotal').textContent = tasks.filter(t => t.completedAt).length;
  document.getElementById('statBest').textContent = computeBestWeekday();
  document.getElementById('weeklySummary').innerHTML = `<p class="summary-text">${computeWeeklySummary().html}</p>`;
  renderHeatmap();
  renderCategoryBars();
  renderTrendChart();
  generateInsights();
}

/* ---------- Mood tracker ---------- */

const MOOD_KEY = 'fieldlog_moods';

function loadMoods() {
  try {
    const raw = localStorage.getItem(MOOD_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function saveMoods(m) {
  localStorage.setItem(MOOD_KEY, JSON.stringify(m));
}
let moods = loadMoods();

document.querySelectorAll('.mood-emoji-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    moods[todayKey()] = btn.dataset.mood;
    saveMoods(moods);
    renderMoodTracker();
  });
});

function renderMoodTracker() {
  document.querySelectorAll('.mood-emoji-btn').forEach(btn => {
    btn.classList.toggle('selected', moods[todayKey()] === btn.dataset.mood);
  });

  const week = document.getElementById('moodWeek');
  week.innerHTML = '';
  const labelWrap = document.createElement('span');
  labelWrap.className = 'mood-week-label';
  labelWrap.textContent = 'Last 7 days:';
  week.appendChild(labelWrap);

  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    const k = dayKey(cursor);
    const col = document.createElement('div');
    const cell = document.createElement('div');
    cell.className = 'mood-week-cell';
    cell.textContent = moods[k] || '';
    const label = document.createElement('div');
    label.className = 'mood-week-day';
    label.textContent = WEEKDAY_NAMES[cursor.getDay()];
    col.appendChild(cell);
    col.appendChild(label);
    week.appendChild(col);
    cursor.setDate(cursor.getDate() + 1);
  }
}

/* ---------- CSV export ---------- */

function csvEscape(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

document.getElementById('exportBtn').addEventListener('click', () => {
  const header = ['Text', 'Category', 'Priority', 'DueDate', 'CreatedAt', 'CompletedAt', 'Status'];
  const rows = tasks.map(t => [
    t.text, t.category, t.priority || 'Medium', t.dueDate || '',
    t.createdAt, t.completedAt || '', t.completedAt ? 'Completed' : 'Open'
  ]);
  const csv = [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fieldlog-export-${todayKey()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* ---------- Sample data (for demo / first-time viewers) ---------- */

function generateSampleData() {
  const cats = ['Work', 'Personal', 'Learning'];
  const priorities = ['High', 'Medium', 'Low'];
  const sampleTexts = [
    'Review SQL queries for weekly report', 'Update Power BI dashboard filters',
    'Read chapter on DAX filter context', 'Call plumber about kitchen sink',
    'Prepare notes for mock interview', 'Clean up GitHub repo README',
    'Grocery shopping', 'Practice window functions', 'Write project documentation',
    'Gym session', 'Refactor Excel macro', 'Watch Power BI tutorial',
    'Reply to recruiter email', 'Organize desk', 'Mock SQL interview practice'
  ];
  const newTasks = [];
  for (let i = 0; i < sampleTexts.length; i++) {
    const daysAgo = Math.floor(Math.random() * 20);
    const created = new Date();
    created.setDate(created.getDate() - daysAgo - Math.floor(Math.random() * 3));
    const isDone = Math.random() < 0.7;
    let completedAt = null;
    if (isDone) {
      const completed = new Date(created);
      completed.setDate(completed.getDate() + Math.floor(Math.random() * 2));
      completed.setHours(9 + Math.floor(Math.random() * 10));
      completedAt = completed.toISOString();
    }
    newTasks.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + i,
      text: sampleTexts[i],
      category: cats[Math.floor(Math.random() * cats.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      dueDate: null,
      createdAt: created.toISOString(),
      completedAt
    });
  }
  tasks = newTasks;
  saveTasks(tasks);

  const emojis = ['😐', '🙂', '😄', '🙂', '😞', '🤩', '🙂'];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    moods[dayKey(cursor)] = emojis[i];
    cursor.setDate(cursor.getDate() + 1);
  }
  saveMoods(moods);

  renderTasks();
  renderAnalytics();
  renderMoodTracker();
}

/* ---------- Init ---------- */

renderTasks();
renderAnalytics();
renderMoodTracker();
window.addEventListener('resize', () => {
  if (document.getElementById('panel-analytics').classList.contains('active')) {
    renderTrendChart();
  }
});
