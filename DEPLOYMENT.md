# CNC 재고 관리 시스템 - 배포 가이드

## 목차
1. [개발 환경 실행](#개발-환경-실행)
2. [프로덕션 빌드](#프로덕션-빌드)
3. [프로덕션 배포](#프로덕션-배포)
4. [환경 변수 설정](#환경-변수-설정)
5. [배포 체크리스트](#배포-체크리스트)

---

## 개발 환경 실행

### 사전 준비
```bash
# 1. 의존성 설치 (루트 디렉토리)
npm install

# 2. 서버 의존성 설치
cd server
npm install
cd ..
```

### 개발 서버 실행

**방법 1: 통합 실행 (권장)**
```bash
# 프론트엔드 + 백엔드를 한 번에 실행
npm run dev
```

이 명령어는 다음을 동시에 실행합니다:
- **프론트엔드**: `http://localhost:5173` (Vite 개발 서버)
- **백엔드**: `http://localhost:3001` (Express API 서버)

**방법 2: 개별 실행**
```bash
# 터미널 1: 프론트엔드 실행
npm run dev:client

# 터미널 2: 백엔드 실행
npm run dev:server
```

### 개발 환경 구조
```
개발 환경:
┌──────────────────────────────────────────┐
│  브라우저: http://localhost:5173         │
│  ↓ (Vite 프록시)                         │
│  /api/* → http://localhost:3001          │
└──────────────────────────────────────────┘
```

- Vite가 `/api` 경로를 Express 서버로 프록시
- CORS 문제 없음
- Hot Module Replacement (HMR) 지원

---

## 프로덕션 빌드

### 1. 프론트엔드 빌드
```bash
# React 앱을 프로덕션용으로 빌드
npm run build
```

빌드 결과물: `dist/` 디렉토리에 생성
- 최적화된 정적 파일 (HTML, CSS, JS)
- Tree-shaking 및 코드 분할 적용
- 압축 및 번들링 완료

### 2. 서버 의존성 설치
```bash
# 프로덕션 서버 의존성 확인
npm run build:server
```

---

## 프로덕션 배포

### 프로덕션 환경 구조
```
프로덕션 환경:
┌──────────────────────────────────────────┐
│  http://your-domain.com                  │
│  ↓                                        │
│  Express 서버 (포트 80/443/8080)         │
│  ├── /api/* → API 핸들러                 │
│  └── /* → React 앱 (dist/)               │
└──────────────────────────────────────────┘
```

### 배포 절차

#### 1. 환경 변수 설정
```bash
# .env.production 파일 생성
cp .env_template .env.production
```

`.env.production` 수정:
```env
# Supabase 설정 (동일)
VITE_SUPABASE_URL=https://yeucugpcywmtfytvtzum.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# 프로덕션 서버 설정
PORT=8080                    # 또는 80, 443
NODE_ENV=production

# 시스템 관리자 (선택)
SYSTEM_ADMIN_EMAIL=admin@example.com
SYSTEM_ADMIN_PASSWORD=strong_password
```

#### 2. 빌드 및 실행
```bash
# 1. 프론트엔드 빌드
npm run build

# 2. 서버 실행
npm start
```

#### 3. 서버 접속
```
http://your-domain.com:8080
```

---

## 환경 변수 설정

### 필수 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 익명 키 (프론트엔드용) | `eyJhbGci...` |
| `SUPABASE_SERVICE_KEY` | Supabase 서비스 키 (서버용) | `eyJhbGci...` |
| `PORT` | 서버 포트 번호 | `3001` (개발), `8080` (프로덕션) |
| `NODE_ENV` | 실행 환경 | `development` 또는 `production` |

### 환경별 파일

- **개발**: `.env.local`
- **프로덕션**: `.env.production`
- **템플릿**: `.env_template`

---

## 배포 옵션

### 옵션 1: VPS/클라우드 서버 (권장)

**지원 플랫폼:**
- AWS EC2
- Google Cloud Platform
- DigitalOcean
- Linode
- Vultr

**배포 단계:**
```bash
# 1. 서버 접속
ssh user@your-server-ip

# 2. 저장소 클론
git clone https://github.com/your-repo.git
cd CNC_MT_Inventory_V2

# 3. Node.js 설치 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. 의존성 설치
npm install
cd server && npm install && cd ..

# 5. 환경 변수 설정
cp .env_template .env.production
nano .env.production  # 환경 변수 입력

# 6. 빌드
npm run build

# 7. PM2로 프로세스 관리 (권장)
sudo npm install -g pm2
pm2 start server/index.js --name cnc-inventory
pm2 save
pm2 startup
```

### 옵션 2: Docker 배포

**Dockerfile 생성** (프로젝트 루트):
```dockerfile
# Multi-stage build
FROM node:20 AS builder

WORKDIR /app

# 의존성 설치
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install
RUN cd server && npm install

# 소스 코드 복사
COPY . .

# 프론트엔드 빌드
RUN npm run build

# 프로덕션 이미지
FROM node:20-slim

WORKDIR /app

# 서버 의존성만 복사
COPY --from=builder /app/server/package*.json ./server/
RUN cd server && npm install --production

# 빌드 결과물 및 서버 코드 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

WORKDIR /app/server

EXPOSE 8080

CMD ["node", "index.js"]
```

**Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    env_file:
      - .env.production
    restart: unless-stopped
```

**실행:**
```bash
docker-compose up -d
```

### 옵션 3: Vercel/Netlify (프론트엔드만)

**주의:** 백엔드 API는 별도 배포 필요

**프론트엔드 배포:**
```bash
# Vercel
npm install -g vercel
vercel --prod

# Netlify
npm install -g netlify-cli
netlify deploy --prod
```

**백엔드 배포 (선택):**
- Heroku
- Railway
- Render
- AWS Elastic Beanstalk

---

## 배포 체크리스트

### 배포 전

- [ ] `.env.production` 파일 생성 및 설정 완료
- [ ] Supabase 연결 정보 확인
- [ ] 프로덕션 빌드 테스트 완료 (`npm run build`)
- [ ] 로컬에서 프로덕션 빌드 실행 테스트
- [ ] Git에 민감한 정보 커밋 안 됨 확인

### 배포 중

- [ ] 서버에 Node.js 설치됨 (v18 이상)
- [ ] 의존성 설치 완료 (루트 + server)
- [ ] 환경 변수 서버에 설정 완료
- [ ] 방화벽 포트 오픈 (80, 443, 또는 지정 포트)
- [ ] 프로덕션 빌드 완료

### 배포 후

- [ ] 웹사이트 정상 접속 확인
- [ ] 로그인 기능 테스트
- [ ] API 엔드포인트 응답 확인
- [ ] Supabase 데이터 조회 확인
- [ ] 에러 로그 모니터링 설정
- [ ] 백업 전략 수립

---

## 트러블슈팅

### 문제 1: 로그인이 안 됨

**원인:** Express 서버가 실행되지 않음

**해결:**
```bash
# 서버 실행 확인
pm2 status

# 서버 재시작
pm2 restart cnc-inventory

# 로그 확인
pm2 logs cnc-inventory
```

### 문제 2: 정적 파일 로드 실패

**원인:** `dist/` 폴더가 없거나 경로 문제

**해결:**
```bash
# 빌드 재실행
npm run build

# dist 폴더 확인
ls -la dist/
```

### 문제 3: API 요청 404 에러

**원인:** API 라우트가 정적 파일 핸들러 다음에 위치

**해결:** `server/index.js`에서 API 라우트가 정적 파일 제공 **전**에 정의되었는지 확인

### 문제 4: Supabase 연결 실패

**원인:** 환경 변수 미설정 또는 잘못된 키

**해결:**
```bash
# 환경 변수 확인
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_KEY

# .env.production 파일 확인
cat .env.production
```

---

## 성능 최적화

### 1. Gzip 압축 활성화

`server/package.json`에 추가:
```json
{
  "dependencies": {
    "compression": "^1.7.4"
  }
}
```

`server/index.js`에 추가:
```javascript
const compression = require('compression');
app.use(compression());
```

### 2. 캐싱 헤더 설정

```javascript
app.use(express.static(distPath, {
  maxAge: '1d', // 정적 파일 1일 캐싱
  etag: true,
}));
```

### 3. HTTPS 설정 (프로덕션 필수)

- Let's Encrypt (무료 SSL)
- Nginx 리버스 프록시 사용 권장

---

## 모니터링

### 로그 관리 (PM2)
```bash
# 실시간 로그 확인
pm2 logs cnc-inventory

# 로그 파일 위치
~/.pm2/logs/
```

### 서버 상태 모니터링
```bash
# PM2 모니터링 대시보드
pm2 monit

# 서버 리소스 확인
pm2 status
```

---

## 보안 권장사항

1. **환경 변수 보호**: `.env` 파일을 Git에 커밋하지 마세요
2. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS 사용
3. **CORS 설정**: 필요한 도메인만 허용
4. **Rate Limiting**: API 요청 제한 설정
5. **정기 업데이트**: 의존성 패키지 정기 업데이트

---

## 지원

문제가 발생하면 다음을 확인하세요:

1. **서버 로그**: `pm2 logs` 또는 `docker logs`
2. **브라우저 콘솔**: 프론트엔드 에러 확인
3. **네트워크 탭**: API 요청/응답 확인
4. **Supabase 대시보드**: 데이터베이스 연결 상태 확인

---

**마지막 업데이트**: 2025-11-14
