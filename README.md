# retirel-front

자산관리 서비스 Retiriel 프론트엔드

## 기술 스택

- **React 19** + **TypeScript**
- **Vite** (빌드 도구)
- **ESLint** + **Prettier** (코드 품질)
- **Vercel** (배포)

## 시작하기

### 사전 요구사항

- Node.js >= 20

### 설치 및 실행

```bash
npm install
npm run dev
```

### 환경 변수 설정

`.env.example`을 참고하여 환경 변수를 설정합니다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
|------|------|
| `VITE_API_BASE_URL` | 백엔드 API 기본 URL |
| `VITE_APP_ENV` | 애플리케이션 환경 (`development` / `production`) |

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 검사 |
| `npm run lint:fix` | ESLint 자동 수정 |
| `npm run format` | Prettier 포맷팅 |
| `npm run format:check` | Prettier 검사 |

## 배포

[Vercel](https://vercel.com)을 통해 자동 배포됩니다.

- `main` 브랜치 푸시 시 프로덕션 배포
- PR 생성 시 프리뷰 배포 자동 생성

### Vercel 초기 설정 (최초 1회)

1. [Vercel 대시보드](https://vercel.com/dashboard)에서 GitHub 저장소 연동
2. 환경 변수 설정 (Project Settings > Environment Variables)
3. 이후 배포는 GitHub 연동으로 자동화됨
