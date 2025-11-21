# 🎨 Modern Light Theme Guide

이 문서는 가구 배치 플랫폼의 새로운 밝은 테마 시스템에 대한 가이드입니다.

## 📋 목차

1. [테마 개요](#테마-개요)
2. [적용 완료 현황](#적용-완료-현황)
3. [색상 시스템](#색상-시스템)
4. [컴포넌트 스타일](#컴포넌트-스타일)
5. [사용 방법](#사용-방법)
6. [커스터마이징](#커스터마이징)

## 테마 개요

### 디자인 철학

- **밝고 깔끔한**: 흰색 배경과 밝은 색상으로 현대적인 느낌
- **부드러운 전환**: 모든 인터랙션에 부드러운 애니메이션
- **일관성**: 모든 컴포넌트에서 동일한 디자인 언어 사용
- **접근성**: 충분한 대비와 명확한 시각적 피드백

### 주요 특징

- CSS 변수 기반 테마 시스템
- 반투명 효과와 블러 배경
- 그라데이션 강조 색상
- 부드러운 그림자와 둥근 모서리
- 호버 및 활성 상태 애니메이션

## 적용 완료 현황

### ✅ 완료된 페이지 및 컴포넌트

모든 페이지와 컴포넌트에 새로운 테마가 적용되었습니다:

#### 페이지
- ✅ **홈페이지** (`app/page.tsx`) - 랜딩 페이지
- ✅ **로그인** (`app/auth/login/page.tsx`) - 인증 페이지
- ✅ **회원가입** (`app/auth/register/page.tsx`) - 인증 페이지
- ✅ **프로젝트 목록** (`app/projects/page.tsx`) - 프로젝트 관리
- ✅ **에디터** (`app/editor/[projectId]/page.tsx`) - 3D 에디터

#### UI 컴포넌트
- ✅ **Sidebar** - 가구 카탈로그 사이드바
- ✅ **Toolbar** - 상단 도구 모음
- ✅ **ConnectionStatus** - 연결 상태 표시
- ✅ **LightingPanel** - 조명 시뮬레이션 패널
- ✅ **MeasurePanel** - 측정 도구 패널
- ✅ **Toast** - 알림 메시지
- ✅ **CreateProjectModal** - 프로젝트 생성 모달
- ✅ **Navbar** - 네비게이션 바

#### 3D 컴포넌트
- ✅ **Scene** - 3D 씬 (배경 유지)
- ✅ **Furniture** - 가구 모델
- ✅ **Room** - 방 구조
- ✅ **PlyModel** - PLY 파일 렌더링

### 테마 적용 특징

1. **일관된 색상**: 모든 페이지에서 동일한 CSS 변수 사용
2. **부드러운 전환**: 호버, 클릭 등 모든 인터랙션에 애니메이션
3. **반투명 효과**: 툴바와 패널에 블러 배경 적용
4. **그라데이션**: 네비게이션과 버튼에 그라데이션 강조
5. **그림자**: 깊이감을 주는 다층 그림자 시스템

## 색상 시스템

### 배경 색상
```css
--bg-primary: #f8fafc;      /* 메인 배경 */
--bg-secondary: #ffffff;    /* 카드/패널 배경 */
--bg-tertiary: #f1f5f9;     /* 보조 배경 */
--bg-hover: #e2e8f0;        /* 호버 상태 */
```

### 텍스트 색상
```css
--text-primary: #1e293b;    /* 주요 텍스트 */
--text-secondary: #475569;  /* 보조 텍스트 */
--text-tertiary: #64748b;   /* 약한 텍스트 */
```

### 강조 색상
```css
--accent-primary: #3b82f6;  /* 파란색 강조 */
--accent-hover: #2563eb;    /* 호버 상태 */
--accent-light: #dbeafe;    /* 밝은 강조 */
```

### 상태 색상
```css
--success: #10b981;         /* 성공 (초록) */
--warning: #f59e0b;         /* 경고 (노랑) */
--error: #ef4444;           /* 에러 (빨강) */
```

### 테두리 색상
```css
--border-color: #e2e8f0;    /* 기본 테두리 */
--border-hover: #cbd5e1;    /* 호버 테두리 */
```

## 컴포넌트 스타일

### Sidebar
```tsx
<div className="sidebar-container">
  <div className="sidebar-header">
    <h2 className="sidebar-title">가구 카탈로그</h2>
    <input className="search-input" placeholder="검색..." />
  </div>
  
  <button className="category-button">카테고리</button>
  <button className="category-button active">선택됨</button>
  
  <div className="furniture-grid">
    <div className="furniture-card">
      <span className="furniture-emoji">🛏️</span>
      <div className="furniture-name">침대</div>
      <div className="furniture-price">$300</div>
    </div>
  </div>
</div>
```

### Toolbar
```tsx
<div className="toolbar-container">
  <button className="toolbar-button">버튼</button>
  <button className="toolbar-button active">활성</button>
  <div className="toolbar-divider"></div>
</div>
```

### Toast 알림
```tsx
<div className="toast success">성공 메시지</div>
<div className="toast error">에러 메시지</div>
<div className="toast warning">경고 메시지</div>
```

### Panels
```tsx
<div className="lighting-panel">
  <h3 className="lighting-title">💡 조명 시뮬레이션</h3>
  <button className="lighting-button">옵션</button>
  <button className="lighting-button active">선택됨</button>
</div>
```

## 사용 방법

### CSS 변수 직접 사용

```tsx
<div style={{ 
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-md)',
  padding: '1rem'
}}>
  커스텀 스타일
</div>
```

### 클래스와 인라인 스타일 조합

```tsx
<button 
  className="category-button"
  style={{ 
    background: 'var(--success)',
    color: 'white',
    borderColor: 'var(--success)'
  }}
>
  저장
</button>
```

### 그림자 시스템

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

### 둥근 모서리

```css
--radius-sm: 0.375rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-xl: 1rem;
```

## 커스터마이징

### 색상 변경

`app/theme.css`의 `:root` 섹션에서 CSS 변수를 수정하여 색상을 변경할 수 있습니다:

```css
:root {
  --accent-primary: #3b82f6; /* 원하는 색상으로 변경 */
  --accent-hover: #2563eb;
}
```

### 다크 모드 추가

다크 모드를 추가하려면 다음과 같이 CSS를 확장할 수 있습니다:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1e293b;
    --bg-secondary: #334155;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-tertiary: #94a3b8;
    /* ... */
  }
}
```

### 새 컴포넌트 스타일링

새 컴포넌트를 만들 때는 기존 CSS 클래스를 재사용하거나, 동일한 패턴을 따라 새 클래스를 추가하세요:

```tsx
// 기존 스타일 재사용
<div className="furniture-card">
  <span className="furniture-emoji">🪑</span>
  <div className="furniture-name">의자</div>
</div>

// 인라인 스타일로 커스터마이징
<button 
  className="toolbar-button"
  style={{ 
    background: 'var(--success)',
    color: 'white'
  }}
>
  저장
</button>
```

## 🎯 베스트 프랙티스

1. **CSS 변수 사용**: 하드코딩된 색상 대신 항상 CSS 변수 사용
2. **일관된 간격**: 정의된 패딩과 마진 값 사용
3. **전환 효과**: 모든 인터랙티브 요소에 `var(--transition)` 적용
4. **접근성**: 충분한 색상 대비와 포커스 스타일 유지
5. **반응형**: 모바일 화면에서도 잘 보이도록 테스트
6. **재사용**: 기존 클래스를 최대한 재사용하여 일관성 유지

## 📝 참고사항

- 모든 스타일은 `app/theme.css`에 중앙 집중화
- Tailwind CSS와 함께 사용 가능
- 브라우저 호환성: 모던 브라우저 (Chrome, Firefox, Safari, Edge)
- CSS 변수는 IE11에서 지원되지 않음
- 스크롤바 스타일도 커스터마이징되어 있음

## 🚀 향후 개선 사항

- [ ] 다크 모드 지원
- [ ] 테마 전환 애니메이션
- [ ] 사용자 정의 테마 색상
- [ ] 모바일 반응형 최적화
- [ ] 접근성 개선 (WCAG 2.1 AA 준수)

---

**마지막 업데이트**: 2024년 11월
**버전**: 2.0.0 - 전체 페이지 테마 적용 완료
