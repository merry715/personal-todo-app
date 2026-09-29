const VALID_CATEGORIES = ['work', 'personal', 'study'];
const CATEGORY_LABELS  = { work: '업무', personal: '개인', study: '공부' };

let todos         = [];
let currentFilter = 'all';
let currentSort   = 'newest'; // 'newest' | 'oldest' | 'incomplete'

// ── 유틸리티 ─────────────────────────────────────────────

function formatDate(date) {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}`;
}

// ── 테마 ─────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch {}
}

function loadTheme() {
  applyTheme(localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
}

function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}

// ── localStorage ─────────────────────────────────────────

function loadTodos() {
  try {
    const raw    = localStorage.getItem('todos');
    const parsed = raw ? JSON.parse(raw) : [];
    todos = Array.isArray(parsed) ? parsed : [];
    todos = todos.map(normalizeTodo);
  } catch {
    todos = [];
  }
}

function saveTodos() {
  try { localStorage.setItem('todos', JSON.stringify(todos)); } catch {}
}

// 유효하지 않은 category 값을 'personal'로 정규화
function normalizeTodo(todo) {
  return {
    ...todo,
    category: VALID_CATEGORIES.includes(todo.category) ? todo.category : 'personal',
  };
}

// ── 정렬 ─────────────────────────────────────────────────

// 원본 배열을 변경하지 않고 정렬된 복사본 반환
function getSorted(arr) {
  const copy = [...arr];
  switch (currentSort) {
    case 'oldest':
      return copy.sort((a, b) => Number(a.id) - Number(b.id));
    case 'incomplete':
      return copy.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return Number(b.id) - Number(a.id);
      });
    default: // 'newest'
      return copy.sort((a, b) => Number(b.id) - Number(a.id));
  }
}

// ── 대시보드 ──────────────────────────────────────────────

// 필터·정렬에 무관하게 항상 전체 todos 기준으로 계산
function renderDashboard() {
  const total      = todos.length;
  const done       = todos.filter(t => t.completed).length;
  const overallPct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById('overall-count').textContent = `${done} / ${total}`;
  document.getElementById('overall-pct').textContent   = `${overallPct}%`;
  document.getElementById('overall-bar').style.width   = `${overallPct}%`;

  const progressTrack = document.querySelector('.progress-track[role="progressbar"]');
  if (progressTrack) progressTrack.setAttribute('aria-valuenow', overallPct);

  VALID_CATEGORIES.forEach(cat => {
    const catTodos  = todos.filter(t => t.category === cat);
    const catTotal  = catTodos.length;
    const catDone   = catTodos.filter(t => t.completed).length;
    const catPct    = catTotal === 0 ? 0 : Math.round((catDone / catTotal) * 100);

    document.getElementById(`count-${cat}`).textContent = `${catDone} / ${catTotal}`;
    document.getElementById(`bar-${cat}`).style.width   = `${catPct}%`;
  });
}

// ── 렌더링 ───────────────────────────────────────────────

function renderTodos() {
  const list     = document.getElementById('todo-list');
  const empty    = document.getElementById('empty-message');
  const clearBtn = document.getElementById('clear-completed-btn');

  // 필터 탭 활성 상태 및 aria-selected 갱신
  document.querySelectorAll('.filter-tab').forEach(tab => {
    const active = tab.dataset.filter === currentFilter;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  const filtered = currentFilter === 'all'
    ? todos
    : todos.filter(t => t.category === currentFilter);
  const sorted = getSorted(filtered);

  list.innerHTML = '';
  renderDashboard();

  // 완료 항목 유무에 따라 삭제 버튼 활성화 (전체 todos 기준)
  clearBtn.disabled = !todos.some(t => t.completed);

  if (sorted.length === 0) {
    empty.textContent = (currentFilter !== 'all' && todos.length > 0)
      ? '해당 카테고리의 할 일이 없습니다.'
      : '등록된 할 일이 없습니다.';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  // DocumentFragment로 DOM 조작 최소화 (200개 항목에서도 빠른 렌더링)
  const frag = document.createDocumentFragment();
  sorted.forEach(todo => frag.appendChild(createTodoElement(todo)));
  list.appendChild(frag);
}

// 단일 할 일 항목 DOM 요소 생성
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.completed ? ' completed' : '');

  const checkbox = document.createElement('input');
  checkbox.type      = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked   = todo.completed;
  checkbox.setAttribute('aria-label', `완료 표시: ${todo.text}`);
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  const badge = document.createElement('span');
  badge.className   = `category-badge cat-${todo.category}`;
  badge.textContent = CATEGORY_LABELS[todo.category];

  const span = document.createElement('span');
  span.className   = 'todo-text';
  span.textContent = todo.text;
  span.title       = '더블클릭 또는 Enter로 수정';
  span.tabIndex    = 0; // 키보드 포커스 가능
  span.addEventListener('dblclick', () => enterEditMode(li, todo, span));
  // Enter / F2 키로도 수정 모드 진입 (키보드 전용 사용자 지원)
  span.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      enterEditMode(li, todo, span);
    }
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className   = 'delete-btn';
  deleteBtn.textContent = '삭제';
  deleteBtn.setAttribute('aria-label', `삭제: ${todo.text}`);
  deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

  li.appendChild(checkbox);
  li.appendChild(badge);
  li.appendChild(span);
  li.appendChild(deleteBtn);

  return li;
}

// 수정 모드: 텍스트 span을 숨기고 input 삽입
function enterEditMode(li, todo, span) {
  const input     = document.createElement('input');
  input.type      = 'text';
  input.className = 'edit-input';
  input.value     = todo.text;
  input.setAttribute('aria-label', '할 일 수정');

  span.style.display = 'none';
  li.insertBefore(input, span);
  input.focus();
  input.select();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const newText = input.value.trim();
      if (newText) {
        const target = todos.find(t => t.id === todo.id);
        if (target) target.text = newText;
        saveTodos();
      }
      renderTodos();
    } else if (e.key === 'Escape') {
      renderTodos();
    }
  });

  // Enter/Esc 후 renderTodos()가 input을 DOM에서 제거하므로 중복 실행 안 됨
  input.addEventListener('blur', () => {
    if (document.body.contains(input)) renderTodos();
  });
}

// ── 데이터 조작 ──────────────────────────────────────────

function addTodo() {
  const inputEl  = document.getElementById('todo-input');
  const selectEl = document.getElementById('category-select');
  const text     = inputEl.value.trim();
  if (!text) return;

  todos.push({
    id:        String(Date.now()),
    text,
    category:  selectEl.value,
    completed: false,
    createdAt: new Date().toISOString(),
  });

  saveTodos();
  renderTodos();

  inputEl.value = '';
  inputEl.focus();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    renderTodos();
  }
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

function clearCompleted() {
  if (!confirm('완료된 항목을 모두 삭제할까요?')) return;
  todos = todos.filter(t => !t.completed);
  saveTodos();
  renderTodos();
}

function setFilter(filter) {
  currentFilter = filter;
  renderTodos();
}

function setSort(sort) {
  currentSort = sort;
  renderTodos();
}

// ── 내보내기 / 가져오기 ───────────────────────────────────

function exportTodos() {
  const d   = new Date();
  const pad = n => String(n).padStart(2, '0');
  const filename = `todos-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;

  const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importTodos(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    let parsed;

    try {
      parsed = JSON.parse(e.target.result);
    } catch {
      alert('파일을 읽을 수 없습니다. 올바른 JSON 형식인지 확인해 주세요.');
      return;
    }

    if (!Array.isArray(parsed)) {
      alert('가져오기 실패: 파일 최상위가 배열이어야 합니다.');
      return;
    }

    const REQUIRED = ['id', 'text', 'category', 'completed', 'createdAt'];
    const badItem  = parsed.find(
      item => !item || typeof item !== 'object' || !REQUIRED.every(k => k in item)
    );

    if (badItem) {
      alert('가져오기 실패: 일부 항목에 필수 필드(id·text·category·completed·createdAt)가 없습니다.');
      return;
    }

    if (!confirm(`${parsed.length}개의 할 일을 가져옵니다.\n현재 목록(${todos.length}개)을 덮어씁니다. 계속하시겠습니까?`)) return;

    todos = parsed.map(normalizeTodo);
    saveTodos();
    renderTodos();
  };

  reader.onerror = () => alert('파일을 읽는 중 오류가 발생했습니다.');
  reader.readAsText(file);
}

// ── 초기화 ───────────────────────────────────────────────

function init() {
  const inputEl     = document.getElementById('todo-input');
  const importInput = document.getElementById('import-input');

  document.getElementById('add-btn').addEventListener('click', addTodo);
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => setFilter(tab.dataset.filter));
  });

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('sort-select').addEventListener('change', (e) => setSort(e.target.value));
  document.getElementById('clear-completed-btn').addEventListener('click', clearCompleted);

  document.getElementById('export-btn').addEventListener('click', exportTodos);
  document.getElementById('import-btn').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importTodos(file);
    e.target.value = ''; // 같은 파일 재선택 허용
  });

  // 전역 단축키
  document.addEventListener('keydown', (e) => {
    const tag       = document.activeElement.tagName;
    const isEditing = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');

    if (e.key === '/' && !isEditing) {
      e.preventDefault();
      inputEl.focus();
    }

    if (e.key === 'd' && e.ctrlKey) {
      e.preventDefault();
      toggleTheme();
    }
  });

  document.getElementById('today-date').textContent = formatDate(new Date());

  loadTheme();
  loadTodos();
  renderTodos();
}

document.addEventListener('DOMContentLoaded', init);
