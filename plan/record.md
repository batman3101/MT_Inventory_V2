# 개발 진행 기록 (Development Progress Record)

## 현재까지 진행된 내용 (Current Progress)

*   **프로젝트 구조 확인:** `CNC_MT_Inventory_V2` 프로젝트 내 `CNC_MT_Inventory_V3` 디렉토리가 새로운 고도화 버전임을 확인했습니다.
*   **백엔드 서버 초기 설정:** `CNC_MT_Inventory_V3/server` 디렉토리 내 Node.js 기반의 Express 서버가 초기 설정되어 있음을 확인했습니다.
*   **Supabase 연동 준비:** Node.js 서버에서 Supabase와 연동하기 위한 `@supabase/supabase-js` 라이브러리를 설치했습니다.
*   **환경 변수 설정 준비:** Supabase 키를 안전하게 관리하기 위해 `CNC_MT_Inventory_V3/server/.env.local` 파일을 생성하고, `dotenv` 패키지를 설치하여 환경 변수를 로드하도록 `index.js` 파일을 수정했습니다.
*   **예시 API 엔드포인트 추가:** `/api/parts` 엔드포인트를 `index.js`에 추가하여 Supabase `parts` 테이블에서 데이터를 가져오는 예시를 구현했습니다.

## 다음 개발 단계 (Next Development Step)

**가장 중요한 다음 단계는 프로덕션 Supabase 프로젝트의 스키마를 로컬 파일로 덤프하여 `V3` 개발을 위한 별도의 Supabase 프로젝트에 적용하는 것입니다.**

이는 프로덕션 데이터베이스의 안전을 보장하고, `V3` 개발 중 발생할 수 있는 잠재적인 데이터 손상 위험을 방지하기 위함입니다.

**구체적인 작업:**
1.  **Supabase CLI 설치 (아직 설치하지 않았다면).**
2.  **프로덕션 Supabase 프로젝트의 스키마를 로컬 파일로 덤프합니다.**
    *   `supabase db pull --project-ref <YOUR_PRODUCTION_PROJECT_REF> --schema public --file supabase/migrations/initial_schema.sql` 명령어를 사용합니다.
3.  **`V3` 개발을 위한 새로운 Supabase 프로젝트를 생성합니다.**
4.  **덤프한 스키마 파일을 새로운 `V3`용 Supabase 프로젝트에 적용합니다.**
    *   `supabase db push --project-ref <YOUR_V3_PROJECT_REF> --file supabase/migrations/initial_schema.sql` 명령어를 사용합니다.
5.  **새로운 `V3` Supabase 프로젝트의 URL과 Anon Key를 `CNC_MT_Inventory_V3/server/.env.local` 파일에 업데이트합니다.**