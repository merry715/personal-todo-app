const VALID_CATEGORIES = ['work', 'personal', 'study'];
const CATEGORY_LABELS  = { work: '업무', personal: '개인', study: '공부' };

/** 메모리 내 할 일 목록 */
let todos         = [];
let currentFilter = 'all';

// localStorage에서 할 일 목록 불러오기 (손상 시 빈 배열로 복구)
function loadTodos() {
  try {
    const raw    = localStorage.getItem('todos');
    const parsed = raw ? JSON.parse(raw) : [];
    todos = Array.isArray(parsed) ? parsed : [];
    // 유효하지 않은 category 값은 'personal'로 정규화
    todos = todos.map(todo => ({
      ...todo,
      category: VALID_CATEGORIES.includes(todo.category) ? todo.category : 'personal',
    }));
  } catch {
    todos = [];
  }
}

// 현재 todos를 localStorage에 즉시 저장
function saveTodos() {
  try {
    localStorage.setItem('todos', JSON.stringify(todos));
  } catch {
    // 저장 실패는 조용히 무시
  }
}

// 필터 탭 활성 상태 갱신 + 필터링된 목록 렌더링
function renderTodos() {
  const list  = document.getElementById('todo-list');
  const empty = document.getElementById('empty-message');

  // 필터 탭 활성 상태 반영
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === currentFilter);
  });

  // 현재 필터에 맞는 항목만 추출
  const filtered = currentFilter === 'all'
    ? todos
    : todos.filter(t => t.category === currentFilter);

  list.innerHTML = '';

  if (filtered.length === 0) {
    // 전체 목록이 비어 있는 경우와 필터 결과가 없는 경우를 구분
    empty.textContent = (currentFilter !== 'all' && todos.length > 0)
      ? '해당 카테고리의 할 일이 없습니다.'
      : '등록된 할 일이 없습니다.';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  filtered.forEach(todo => list.appendChild(createTodoElement(todo)));
}

// 단일 할 일 항목 DOM 요소 생성
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.completed ? ' completed' : '');

  // 체크박스: 완료 상태 토글
  const checkbox     = document.createElement('input');
  checkbox.type      = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked   = todo.completed;
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  // 카테고리 배지
  const badge       = document.createElement('span');
  badge.className   = `category-badge cat-${todo.category}`;
  badge.textContent = CATEGORY_LABELS[todo.category];

  // 할 일 텍스트: 더블클릭으로 수정 모드 진입
  const span       = document.createElement('span');
  span.className   = 'todo-text';
  span.textContent = todo.text;
  span.title       = '더블클릭하여 수정';
  span.addEventListener('dblclick', () => enterEditMode(li, todo, span));

  // 삭제 버튼
  const deleteBtn       = document.createElement('button');
  deleteBtn.className   = 'delete-btn';
  deleteBtn.textContent = '삭제';
  deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

  li.appendChild(checkbox);
  li.appendChild(badge);
  li.appendChild(span);
  li.appendChild(deleteBtn);

  return li;
}

// 수정 모드 진입: 텍스트 span을 숨기고 input을 삽입
function enterEditMode(li, todo, span) {
  const input     = document.createElement('input');
  input.type      = 'text';
  input.className = 'edit-input';
  input.value     = todo.text;

  span.style.display = 'none';
  li.insertBefore(input, span);
  input.focus();
  input.select();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const newText = input.value.trim();
      if (newText) {
        // todos 배열에서 해당 항목 텍스트 갱신
        const target = todos.find(t => t.id === todo.id);
        if (target) target.text = newText;
        saveTodos();
      }
      renderTodos();
    } else if (e.key === 'Escape') {
      renderTodos();
    }
  });

  // 포커스 이탈 시 수정 취소
  // Enter/Esc로 이미 renderTodos()가 호출된 경우 input은 DOM에서 제거되므로 중복 실행되지 않음
  input.addEventListener('blur', () => {
    if (document.body.contains(input)) renderTodos();
  });
}

// 할 일 추가
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

// 완료/미완료 상태 전환
function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    renderTodos();
  }
}

// 할 일 삭제
function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

// 필터 변경
function setFilter(filter) {
  currentFilter = filter;
  renderTodos();
}

// 앱 초기화: 이벤트 등록 → 데이터 로드 → 렌더링
function init() {
  const inputEl = document.getElementById('todo-input');
  document.getElementById('add-btn').addEventListener('click', addTodo);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo();
  });

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => setFilter(tab.dataset.filter));
  });

  loadTodos();
  renderTodos();
}

document.addEventListener('DOMContentLoaded', init);
