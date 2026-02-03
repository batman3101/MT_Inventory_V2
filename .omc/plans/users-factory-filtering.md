# 사용자 관리 공장별 필터링 기능 구현 계획 (v3 - Critic 피드백 반영)

## Context

### Original Request
사용자 관리 페이지에서 공장별 필터링 기능 구현:
1. ALV 공장 선택 시 ALV 공장 소속 사용자만 표시
2. ALT 공장 선택 시 ALT 공장 소속 사용자만 표시
3. system_admin은 모든 공장의 사용자를 볼 수 있어야 함
4. 사용자 추가/편집 시 공장(factory_id) 지정 필요
5. 공장 변경 시 사용자 목록 즉시 갱신

### Critic Feedback History

#### v1 Issues (모두 해결됨)
- ✅ searchUsers, getUsersStats factory 필터링 추가
- ✅ 서비스 stateless 패턴 적용
- ✅ 중복 제거 (getAllUsers 유지, 새 함수 추가)
- ✅ updateUser 설명 추가
- ✅ i18n 키 추가

#### v2 Issues (이번 수정 대상)
1. ❌ 패턴 불일치 주장 → 명확히 설명 (의도적 차이)
2. ❌ searchUsersByFactory 쿼리 로직 오류 → 수정
3. ❌ Checkbox import 누락 → 추가
4. ❌ Store CRUD 후 refresh 패턴 미언급 → 추가
5. ❌ common.unknown i18n 키 누락 → 추가

### Pattern Decision: 명시적 파라미터 패턴 선택

**`suppliers.service.ts` vs Users Service 패턴 차이점:**

| 항목 | suppliers.service.ts | users.service.ts (신규) |
|------|---------------------|-------------------------|
| Factory ID 획득 | `getFactoryId()` 내부 호출 | 파라미터로 전달 |
| null 처리 | 불가 (항상 현재 공장) | 가능 (전체 조회) |
| 유연성 | 낮음 | 높음 |

**의도적 차이 이유:**
- `system_admin`의 "전체 공장 보기" 기능에는 `factoryId=null` 전달 필요
- `getFactoryId()`는 null 반환 불가 (항상 유효한 factory ID 반환)
- 컴포넌트 레이어에서 role 기반 로직 처리 후 적절한 factoryId 전달

---

## Work Objectives

### Deliverables
1. **users.service.ts** - factory 필터링 함수들 (명시적 파라미터 패턴)
2. **users.store.ts** - factory 필터링 액션들 + CRUD 후 refresh 패턴
3. **createUser.js** - factory_id 저장 처리
4. **i18n** - 새 UI 문자열 (common.unknown 포함)
5. **Users.tsx** - 공장 선택 UI (Checkbox import 포함)

### Definition of Done
- [ ] ALV/ALT 공장 선택 시 해당 공장 소속 사용자만 표시
- [ ] 사용자 검색 시에도 공장 필터링 적용
- [ ] 사용자 통계도 공장 필터링 적용
- [ ] system_admin "전체 공장 보기" 작동
- [ ] CRUD 후 현재 공장 컨텍스트 유지
- [ ] 공장 전환 시 즉시 갱신

---

## Task Flow

```
[Task 1: users.service.ts - 새 함수 추가]
         |
         v
[Task 2: users.store.ts - 새 액션 + CRUD refresh 수정]
         |
         v
[Task 3: api/auth/createUser.js - factory_id 추가]
         |
         v
[Task 4: i18n 키 추가 (common.unknown 포함)]
         |
         v
[Task 5: Users.tsx - UI 통합 (Checkbox import 포함)]
```

---

## Detailed TODOs

### Task 1: users.service.ts 수정
**파일:** `C:/Work Drive/APP/MT_Inventory_V2/src/services/users.service.ts`

#### TODO 1.1: getUsersByFactory 함수 추가
```typescript
/**
 * 공장별 사용자 조회
 *
 * @param factoryId - 공장 ID
 *   - string: 해당 공장 + factory_id가 null인 사용자
 *   - null: 전체 사용자 (system_admin "전체 공장 보기" 용)
 */
export async function getUsersByFactory(factoryId: string | null): Promise<User[]> {
  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (factoryId) {
    // 특정 공장: 해당 공장 사용자 + factory_id가 null인 사용자(미배정)
    query = query.or(`factory_id.eq.${factoryId},factory_id.is.null`);
  }
  // factoryId === null: 필터 없이 전체 조회

  const { data, error } = await query;

  if (error) {
    console.error('사용자 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}
```

#### TODO 1.2: searchUsersByFactory 함수 추가 (쿼리 로직 수정)
```typescript
/**
 * 공장별 사용자 검색
 *
 * 쿼리 구조:
 * - factoryId가 있으면: (factory_id = X OR factory_id IS NULL) AND (search conditions)
 * - factoryId가 null이면: (search conditions)
 *
 * Supabase .or() 다중 호출 시 AND로 결합됨
 */
export async function searchUsersByFactory(
  searchTerm: string,
  factoryId: string | null
): Promise<User[]> {
  let query = supabase
    .from('users')
    .select('*');

  // Step 1: 공장 필터 적용 (있는 경우)
  if (factoryId) {
    query = query.or(`factory_id.eq.${factoryId},factory_id.is.null`);
  }

  // Step 2: 검색 조건 적용 (AND 결합)
  // 결과: (factory filter) AND (search filter)
  query = query
    .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('사용자 검색 에러:', error);
    throw new Error(error.message);
  }

  return data;
}
```

#### TODO 1.3: getUsersStatsByFactory 함수 추가
```typescript
/**
 * 공장별 사용자 통계
 */
export async function getUsersStatsByFactory(factoryId: string | null) {
  let query = supabase.from('users').select('*');

  if (factoryId) {
    query = query.or(`factory_id.eq.${factoryId},factory_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('사용자 통계 조회 에러:', error);
    throw new Error(error.message);
  }

  const users = data as User[];

  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.is_active).length,
    inactiveUsers: users.filter((u) => !u.is_active).length,
    roles: [...new Set(users.map((u) => u.role))].length,
  };
}
```

#### TODO 1.4: CreateUserData 인터페이스에 factory_id 추가
```typescript
interface CreateUserData {
  // ... 기존 필드들
  factory_id?: string | null;  // 추가
}
```

#### TODO 1.5: createUser 함수에서 factory_id 전달
```typescript
const response = await axios.post('/api/auth/createUser', {
  // ... 기존 필드들
  factory_id: user.factory_id || null,  // 추가
});
```

**Acceptance Criteria:**
- [ ] getUsersByFactory(factoryId) 정상 작동
- [ ] searchUsersByFactory에서 공장 필터 + 검색 필터 AND 결합 확인
- [ ] getUsersStatsByFactory(factoryId) 정상 작동
- [ ] 기존 getAllUsers, searchUsers, getUsersStats 변경 없음

---

### Task 2: users.store.ts 수정
**파일:** `C:/Work Drive/APP/MT_Inventory_V2/src/store/users.store.ts`

#### TODO 2.1: 새 상태 추가 (현재 공장 컨텍스트 저장)
```typescript
interface UsersState {
  // 기존 상태들...

  // 추가: 현재 조회 중인 공장 ID (CRUD 후 refresh용)
  currentFactoryId: string | null;

  // 새 액션들
  fetchUsersByFactory: (factoryId: string | null) => Promise<void>;
  searchUsersByFactory: (searchTerm: string, factoryId: string | null) => Promise<void>;
  fetchUsersStatsByFactory: (factoryId: string | null) => Promise<void>;
}
```

#### TODO 2.2: fetchUsersByFactory 구현 (currentFactoryId 저장)
```typescript
fetchUsersByFactory: async (factoryId: string | null) => {
  set({ isLoading: true, error: null, currentFactoryId: factoryId });
  try {
    const users = await usersService.getUsersByFactory(factoryId);
    set({ users, isLoading: false });
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : '사용자 조회 실패',
      isLoading: false,
    });
  }
},
```

#### TODO 2.3: searchUsersByFactory 구현
```typescript
searchUsersByFactory: async (searchTerm: string, factoryId: string | null) => {
  set({ isLoading: true, error: null, currentFactoryId: factoryId });
  try {
    const users = await usersService.searchUsersByFactory(searchTerm, factoryId);
    set({ users, isLoading: false });
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : '사용자 검색 실패',
      isLoading: false,
    });
  }
},
```

#### TODO 2.4: fetchUsersStatsByFactory 구현
```typescript
fetchUsersStatsByFactory: async (factoryId: string | null) => {
  try {
    const stats = await usersService.getUsersStatsByFactory(factoryId);
    set({ stats });
  } catch (error) {
    console.error('사용자 통계 조회 실패:', error);
  }
},
```

#### TODO 2.5: createUser 수정 (currentFactoryId 사용하여 refresh)
```typescript
createUser: async (userData) => {
  set({ isLoading: true, error: null });
  try {
    await usersService.createUser({
      ...userData,
      password: (userData as { password?: string }).password || '',
    });
    // 현재 공장 컨텍스트로 refresh
    const currentFactoryId = get().currentFactoryId;
    const users = await usersService.getUsersByFactory(currentFactoryId);
    const stats = await usersService.getUsersStatsByFactory(currentFactoryId);
    set({ users, stats, isLoading: false });
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : '사용자 추가 실패',
      isLoading: false,
    });
    throw error;
  }
},
```

#### TODO 2.6: updateUser 수정 (currentFactoryId 사용하여 refresh)
```typescript
updateUser: async (userId: string, updates) => {
  set({ isLoading: true, error: null });
  try {
    const updateData: Record<string, unknown> = {};
    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        updateData[key] = updates[key as keyof User];
      }
    }
    await usersService.updateUser(userId, updateData);
    // 현재 공장 컨텍스트로 refresh
    const currentFactoryId = get().currentFactoryId;
    const users = await usersService.getUsersByFactory(currentFactoryId);
    const stats = await usersService.getUsersStatsByFactory(currentFactoryId);
    set({ users, stats, isLoading: false });
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : '사용자 수정 실패',
      isLoading: false,
    });
    throw error;
  }
},
```

#### TODO 2.7: deleteUser 수정 (currentFactoryId 사용하여 refresh)
```typescript
deleteUser: async (userId: string) => {
  set({ isLoading: true, error: null });
  try {
    await usersService.deleteUser(userId);
    // 현재 공장 컨텍스트로 refresh
    const currentFactoryId = get().currentFactoryId;
    const users = await usersService.getUsersByFactory(currentFactoryId);
    const stats = await usersService.getUsersStatsByFactory(currentFactoryId);
    set({ users, stats, isLoading: false });
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : '사용자 삭제 실패',
      isLoading: false,
    });
    throw error;
  }
},
```

**Acceptance Criteria:**
- [ ] fetchUsersByFactory가 currentFactoryId 저장
- [ ] CRUD 후 currentFactoryId 기준으로 refresh
- [ ] 공장 컨텍스트가 CRUD 작업 후에도 유지됨

---

### Task 3: createUser API 수정
**파일:** `C:/Work Drive/APP/MT_Inventory_V2/api/auth/createUser.js`

#### TODO 3.1: factory_id 파라미터 추가
```javascript
const {
  // ... 기존 필드들
  factory_id,  // 추가
} = req.body;
```

#### TODO 3.2: insert에 factory_id 포함
```javascript
const { data: newUser, error: insertError } = await supabase
  .from('users')
  .insert({
    // ... 기존 필드들
    factory_id: factory_id || null,  // 추가
  })
  .select()
  .single();
```

**Acceptance Criteria:**
- [ ] 사용자 생성 시 factory_id 저장됨
- [ ] factory_id 없이도 생성 가능

---

### Task 4: i18n 키 추가
**파일:** `ko.json`, `vi.json`

#### TODO 4.1: ko.json에 키 추가
```json
{
  "common": {
    "unknown": "알 수 없음"
  },
  "users": {
    "factory": "소속 공장",
    "factoryUnassigned": "미지정",
    "factorySelect": "공장 선택",
    "showAllFactories": "전체 공장 사용자 보기",
    "factoryRequired": "공장을 선택해주세요"
  }
}
```

#### TODO 4.2: vi.json에 키 추가
```json
{
  "common": {
    "unknown": "Không xác định"
  },
  "users": {
    "factory": "Nhà máy",
    "factoryUnassigned": "Chưa chỉ định",
    "factorySelect": "Chọn nhà máy",
    "showAllFactories": "Xem tất cả người dùng",
    "factoryRequired": "Vui lòng chọn nhà máy"
  }
}
```

**Acceptance Criteria:**
- [ ] common.unknown 키 추가됨
- [ ] users.factory* 키들 추가됨

---

### Task 5: Users.tsx 수정
**파일:** `C:/Work Drive/APP/MT_Inventory_V2/src/pages/Users.tsx`

#### TODO 5.1: Import 추가 (Checkbox 포함)
```typescript
import {
  Card, Input, Button, Space, Typography, Tag, Spin, Alert,
  Row, Col, Statistic, Modal, Form, Select, message, Result,
  Checkbox  // 추가
} from 'antd';
import { useFactoryStore } from '../store/factory.store';
```

#### TODO 5.2: 상태 및 변수 추가
```typescript
// 컴포넌트 내부
const { factories, activeFactory, viewingFactory, isObserverMode } = useFactoryStore();
const {
  fetchUsersByFactory, searchUsersByFactory, fetchUsersStatsByFactory,
  // ... 기존 액션들
} = useUsersStore();

const effectiveFactoryId = viewingFactory?.factory_id ?? activeFactory?.factory_id ?? null;
const isSystemAdmin = currentUser?.role === 'system_admin';

// system_admin 전용 전체 보기 상태
const [showAllFactories, setShowAllFactories] = useState(false);
```

#### TODO 5.3: 공장 변경 감지 및 자동 갱신
```typescript
useEffect(() => {
  const targetFactoryId = isSystemAdmin && showAllFactories ? null : effectiveFactoryId;

  fetchUsersByFactory(targetFactoryId);
  fetchUsersStatsByFactory(targetFactoryId);
  fetchDepartments();
}, [effectiveFactoryId, showAllFactories, isSystemAdmin]);
```

#### TODO 5.4: 검색 처리 수정
```typescript
useEffect(() => {
  const targetFactoryId = isSystemAdmin && showAllFactories ? null : effectiveFactoryId;

  if (searchText) {
    searchUsersByFactory(searchText, targetFactoryId);
  } else {
    fetchUsersByFactory(targetFactoryId);
  }
}, [searchText, effectiveFactoryId, showAllFactories, isSystemAdmin]);
```

#### TODO 5.5: 테이블에 공장 컬럼 추가
```typescript
{
  title: t('users.factory'),
  dataIndex: 'factory_id',
  key: 'factory_id',
  width: 100,
  render: (factoryId: string | null) => {
    if (!factoryId) return <Tag>{t('users.factoryUnassigned')}</Tag>;
    const factory = factories.find(f => f.factory_id === factoryId);
    return <Tag color="blue">{factory?.factory_code || t('common.unknown')}</Tag>;
  },
  filters: [
    { text: t('users.factoryUnassigned'), value: 'null' },
    ...factories.map(f => ({ text: f.factory_code, value: f.factory_id }))
  ],
  onFilter: (value, record) => {
    if (value === 'null') return record.factory_id === null;
    return record.factory_id === value;
  },
},
```

#### TODO 5.6: 사용자 폼에 factory_id Select 추가
```typescript
<Form.Item
  name="factory_id"
  label={t('users.factory')}
  rules={[{ required: !isSystemAdmin, message: t('users.factoryRequired') }]}
>
  <Select
    placeholder={t('users.factorySelect')}
    allowClear={isSystemAdmin}
  >
    {factories.map(factory => (
      <Option key={factory.factory_id} value={factory.factory_id}>
        {factory.factory_code} - {factory.factory_name}
      </Option>
    ))}
  </Select>
</Form.Item>
```

#### TODO 5.7: showEditModal에 factory_id 초기값 설정
```typescript
form.setFieldsValue({
  // ... 기존 필드들
  factory_id: user.factory_id,
});
```

#### TODO 5.8: handleOk에서 factory_id 전달
```typescript
const userData = {
  ...values,
  factory_id: values.factory_id ?? (isSystemAdmin ? null : effectiveFactoryId),
};

if (editingItem) {
  await updateUser(editingItem.user_id, userData);
} else {
  await createUser(userData);
}
```

#### TODO 5.9: system_admin용 전체 보기 토글 (검색 Input 옆)
```typescript
<Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
  <Space>
    <Input
      placeholder={t('common.search')}
      prefix={<SearchOutlined />}
      style={{ width: 300 }}
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      allowClear
    />
    {isSystemAdmin && (
      <Checkbox
        checked={showAllFactories}
        onChange={(e) => setShowAllFactories(e.target.checked)}
      >
        {t('users.showAllFactories')}
      </Checkbox>
    )}
  </Space>
  {/* ... 나머지 버튼들 */}
</Space>
```

**Acceptance Criteria:**
- [ ] Checkbox가 Ant Design에서 정상 import됨
- [ ] 공장 전환 시 자동 갱신
- [ ] 검색 시에도 공장 필터링 적용
- [ ] CRUD 후 공장 컨텍스트 유지
- [ ] system_admin "전체 공장 보기" 정상 작동

---

## Success Criteria

| Criteria | Test Method |
|----------|-------------|
| ALV 선택 → ALV 사용자만 | 공장 전환 후 목록 확인 |
| 검색 + 공장 필터 AND 결합 | 검색어 입력 후 다른 공장 사용자 미표시 확인 |
| CRUD 후 공장 컨텍스트 유지 | 사용자 추가/수정/삭제 후 목록이 현재 공장 유지 |
| system_admin 전체 보기 | 체크박스 체크 시 모든 공장 사용자 표시 |
| 통계도 공장별 | 공장 전환 시 통계 수치 변경 |

---

## Notes

- **패턴 선택**: 명시적 파라미터 패턴 (suppliers.service.ts의 getFactoryId() 패턴과 다름)
  - 이유: system_admin "전체 공장 보기"에 null 전달 필요
- **쿼리 로직**: Supabase `.or()` 다중 호출 시 AND 결합
  - (factory filter) AND (search filter)
- **CRUD refresh**: currentFactoryId 상태로 공장 컨텍스트 유지
- **updateUser**: 기존 Supabase 직접 호출 유지 (User 타입에 factory_id 포함)
