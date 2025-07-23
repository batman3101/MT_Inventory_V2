# MT Inventory Management System V2 - Frontend

## 개요

MT Inventory Management System V2의 React + TypeScript 기반 프론트엔드 애플리케이션입니다.

## 기술 스택

- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구 및 개발 서버
- **Material-UI (MUI)** - UI 컴포넌트 라이브러리
- **Supabase** - 백엔드 서비스 및 데이터베이스
- **React Router** - 클라이언트 사이드 라우팅
- **date-fns** - 날짜 처리 라이브러리

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 실제 값으로 수정합니다:

```bash
cp .env.example .env
```

`.env` 파일에서 다음 값들을 설정해주세요:

```env
REACT_APP_SUPABASE_URL=your-actual-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-actual-supabase-anon-key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

개발 서버가 `http://localhost:3000`에서 실행됩니다.

### 4. 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

### 5. 프리뷰

```bash
npm run preview
```

빌드된 애플리케이션을 미리 볼 수 있습니다.

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   └── templates/       # 템플릿 컴포넌트
├── pages/              # 페이지 컴포넌트
│   └── InboundPage.tsx # 입고 관리 페이지
├── utils/              # 유틸리티 함수
│   └── supabaseClient.ts # Supabase 클라이언트 설정
├── App.tsx             # 메인 앱 컴포넌트
├── main.tsx            # 애플리케이션 진입점
└── index.css           # 글로벌 스타일
```

## 주요 기능

### 입고 관리 (InboundPage)

- **입고 이력 검색**: 날짜, 부품 코드, 공급업체별 필터링
- **신규 입고 등록**: 부품 선택, 수량 입력, 자동 재고 업데이트
- **실시간 재고 조회**: 선택된 부품의 현재 재고 표시
- **자동 참조번호 생성**: 날짜 기반 고유 참조번호 자동 생성
- **단가 자동 입력**: 부품-공급업체 조합에 따른 단가 자동 조회
- **Excel 내보내기**: 검색 결과를 Excel 파일로 내보내기 (구현 예정)
- **보고서 생성**: 입고 데이터 기반 보고서 생성 (구현 예정)

## 데이터베이스 연동

### Supabase 테이블

- `parts`: 부품 정보
- `suppliers`: 공급업체 정보
- `inventory`: 재고 정보
- `inbound`: 입고 기록
- `part_prices`: 부품 가격 정보

### 주요 기능

- 실시간 데이터 동기화
- 자동 재고 업데이트
- 트랜잭션 기반 데이터 일관성
- Row Level Security (RLS) 적용

## 개발 가이드

### 코드 스타일

- TypeScript strict 모드 사용
- ESLint 규칙 준수
- Material-UI 디자인 시스템 따르기
- 함수형 컴포넌트 및 React Hooks 사용

### 상태 관리

- React useState, useEffect 훅 사용
- 복잡한 상태는 useReducer 고려
- 전역 상태가 필요한 경우 Context API 사용

### 에러 처리

- try-catch 블록으로 에러 처리
- 사용자 친화적인 에러 메시지 표시
- Snackbar를 통한 피드백 제공

## 배포

### Vercel 배포 (권장)

1. Vercel 계정 생성 및 프로젝트 연결
2. 환경 변수 설정
3. 자동 배포 설정

### 기타 배포 옵션

- Netlify
- AWS S3 + CloudFront
- Firebase Hosting

## 문제 해결

### 일반적인 문제

1. **Supabase 연결 오류**: 환경 변수 확인
2. **빌드 오류**: TypeScript 타입 오류 확인
3. **스타일 문제**: Material-UI 테마 설정 확인

### 디버깅

- 브라우저 개발자 도구 활용
- React Developer Tools 사용
- Supabase 대시보드에서 쿼리 확인

## 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 기능 브랜치 생성
3. 코드 작성 및 테스트
4. Pull Request 생성

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 연락처

문의사항이 있으시면 개발팀에 연락해주세요.