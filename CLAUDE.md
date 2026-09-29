# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`personal-todo-app` — 순수 HTML·CSS·JavaScript 할 일 관리 앱. 빌드 도구 없음.

## Running

`index.html`을 브라우저에서 열기. 서버 불필요.

## Architecture

세 파일 단일 계층 구조. 전역 상태는 `script.js` 최상단의 `todos[]`, `currentFilter`, `currentSort`.

| 계층 | 흐름 |
|------|------|
| 상태 변경 | `addTodo / toggleTodo / deleteTodo / clearCompleted / importTodos` → `saveTodos()` → `renderTodos()` |
| 렌더링 | `renderTodos()` → 필터·정렬 → DocumentFragment 조립 → DOM 교체 + `renderDashboard()` |
| 테마 | `<html data-theme>` 속성 + CSS 변수 재정의. FOUC 방지 인라인 스크립트 `<head>` 에 있음 |

## Key Functions

- `normalizeTodo(todo)` — 잘못된 category를 `'personal'`로 정규화; `loadTodos`·`importTodos` 양쪽에서 사용
- `getSorted(arr)` — 원본 불변, 복사본 반환
- `renderTodos()` — 유일한 렌더링 진입점; 필터 탭 aria-selected·clear 버튼 disabled·대시보드를 모두 갱신
- `enterEditMode(li, todo, span)` — blur 이벤트 중복 방지: `document.body.contains(input)` 체크

## Data

`localStorage` 키: `todos` (JSON 배열), `theme` (`"light"` | `"dark"`)

todo 객체: `{ id: string, text: string, category: string, completed: boolean, createdAt: string(ISO 8601) }`
