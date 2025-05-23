# 🔐 RLS 통합 인증 시스템 적용 가이드

## 📋 개요

이 가이드는 기존 MT_Inventory 시스템에 RLS(Row Level Security) 정책을 통합하는 방법을 단계별로 설명합니다.

## 🎯 목표

- **기존 인증 시스템 유지**: Streamlit 세션 기반 인증 그대로 사용
- **RLS 정책 연동**: 데이터베이스 레벨에서 자동 권한 제어
- **점진적 적용**: 기존 코드 최소 수정으로 RLS 기능 추가
- **하위 호환성**: 기존 기능 정상 동작 보장

## 📁 생성된 파일들

### 1. **RLS 통합 인증 모듈**
```
utils/auth_rls_integrated.py
```
- 기존 인증 시스템과 RLS 연동
- 권한 확인 및 데이터 필터링 함수 제공

### 2. **RLS 정책 스크립트**
```
database/rls_policies_improved.sql
database/apply_rls_policies.py
```
- 개선된 RLS 정책 정의
- 정책 적용 자동화 스크립트

### 3. **데모 애플리케이션**
```
app_rls_demo.py
```
- RLS 통합 기능 시연
- 권한별 데이터 접근 테스트

## 🚀 적용 단계

### **1단계: RLS 정책 적용**

```bash
# RLS 정책 적용 스크립트 실행
python database/apply_rls_policies.py
```

### **2단계: 데모 애플리케이션 테스트**

```bash
# RLS 데모 실행
streamlit run app_rls_demo.py
```

**테스트 계정:**
- **시스템 관리자**: `zetooo1972` / `zetooo1972`
- **관리자**: `admin` / `admin`  
- **일반 사용자**: `user` / `user`

### **3단계: 기존 애플리케이션에 점진적 적용**

#### 3.1 인증 시스템 교체

**기존 코드:**
```python
from utils.auth import check_authentication, get_user_role
```

**RLS 통합 버전:**
```python
from utils.auth_rls_integrated import (
    get_current_user_data, has_permission, 
    can_access_record, get_filtered_query
)
```

#### 3.2 권한 확인 개선

**기존 권한 확인:**
```python
if get_user_role() == 'admin':
    # 관리자 기능
```

**RLS 통합 권한 확인:**
```python
if has_permission('manage_users'):
    # 사용자 관리 기능
```

#### 3.3 데이터 쿼리 필터링

**기존 쿼리:**
```python
response = supabase().from_('outbound').select('*').execute()
```

**RLS 통합 쿼리:**
```python
base_query = supabase().from_('outbound').select('*')
filtered_query = get_filtered_query('outbound', base_query)
response = filtered_query.execute()
```

#### 3.4 레코드별 접근 제어

**새로운 접근 제어:**
```python
# 레코드 접근 권한 확인
if can_access_record('outbound', record_data):
    # 레코드 처리
    display_record(record_data)
else:
    st.warning("이 레코드에 접근할 권한이 없습니다.")
```

## 🔧 핵심 기능

### **권한 시스템**

| 역할 | 권한 |
|------|------|
| **시스템 관리자** | 모든 데이터 및 기능 접근 |
| **관리자** | 사용자/부품/재고/공급업체 관리, 모든 부서 데이터 조회 |
| **일반 사용자** | 보고서 조회, 자신의 부서 데이터만 접근 |

### **데이터 접근 규칙**

#### **출고 데이터 (outbound)**
- **시스템 관리자**: 모든 출고 기록 접근
- **관리자**: 모든 출고 기록 접근  
- **일반 사용자**: 자신의 부서 또는 본인이 생성한 출고 기록만

#### **사용자 데이터 (users)**
- **시스템 관리자**: 모든 사용자 정보 접근
- **관리자**: 일반 사용자와 자신의 정보만
- **일반 사용자**: 자신의 정보만

#### **입고/재고 데이터**
- **시스템 관리자**: 모든 데이터 접근
- **관리자**: 모든 데이터 접근
- **일반 사용자**: 본인이 생성한 데이터만

## 📊 RLS 통합 전후 비교

### **기존 시스템**
```python
# 모든 사용자가 같은 데이터에 접근
def get_outbound_data():
    response = supabase().from_('outbound').select('*').execute()
    return response.data

# 애플리케이션 레벨에서 권한 체크
if user_role == 'admin':
    show_admin_menu()
```

### **RLS 통합 시스템**
```python
# 사용자별로 필터링된 데이터 자동 반환
def get_outbound_data():
    base_query = supabase().from_('outbound').select('*')
    filtered_query = get_filtered_query('outbound', base_query)
    response = filtered_query.execute()
    return response.data

# 세밀한 권한 제어
if has_permission('manage_inventory'):
    show_inventory_management()
```

## 🛡️ 보안 강화 사항

### **1. 다층 보안**
- **애플리케이션 레벨**: UI/기능 접근 제어
- **데이터베이스 레벨**: RLS 정책으로 데이터 접근 제어

### **2. 부서별 데이터 격리**
- 사용자는 기본적으로 자신의 부서 데이터만 접근
- 관리자 이상은 필요에 따라 다른 부서 데이터 접근

### **3. 세밀한 권한 제어**
- 단순한 역할 기반에서 기능별 권한으로 세분화
- 권한 확장 시 코드 수정 최소화

## 🔄 마이그레이션 전략

### **Phase 1: 준비 단계**
1. RLS 정책 적용
2. 데모 애플리케이션으로 테스트
3. 권한 매핑 검증

### **Phase 2: 점진적 적용**
1. 새로운 기능부터 RLS 통합 방식 적용
2. 기존 기능 하나씩 마이그레이션
3. 각 단계별 충분한 테스트

### **Phase 3: 완전 전환**
1. 모든 기능 RLS 통합 완료
2. 기존 인증 코드 정리
3. 최종 보안 검증

## ⚠️ 주의사항

### **1. 하위 호환성**
- 기존 함수들은 그대로 유지
- 새로운 RLS 함수들은 추가 형태로 제공
- 단계별 마이그레이션 가능

### **2. 성능 고려사항**
- RLS 정책은 모든 쿼리에 적용됨
- 복잡한 정책은 성능에 영향 가능
- 적절한 인덱스 설정 필요

### **3. 디버깅**
- RLS가 활성화되면 데이터 조회 결과가 달라질 수 있음
- 개발 단계에서는 RLS 비활성화 옵션 고려
- 로그를 통한 권한 확인 과정 추적

## 📞 지원

### **문제 해결**
1. **RLS 정책 적용 실패**: Supabase 대시보드에서 수동 적용
2. **권한 오류**: 사용자 역할 및 부서 정보 확인
3. **데이터 접근 제한**: 권한 매핑 및 RLS 정책 검토

### **추가 개발**
- 새로운 권한 추가: `utils/auth_rls_integrated.py`의 `role_permissions` 수정
- 새로운 테이블 RLS 적용: `database/rls_policies_improved.sql`에 정책 추가
- 접근 규칙 변경: `can_access_record()` 함수 로직 수정

## 🎉 결론

RLS 통합 인증 시스템을 통해:
- **보안 강화**: 데이터베이스 레벨에서 자동 권한 제어
- **개발 효율성**: 권한 체크 코드 간소화
- **확장성**: 새로운 권한 및 규칙 쉽게 추가
- **유지보수성**: 중앙집중식 권한 관리

단계별 적용을 통해 안전하고 효율적인 마이그레이션이 가능합니다. 