/**
 * CNC 재고 관리 시스템 - Supabase 데이터베이스 타입 정의
 *
 * ⚠️ 주의: 이 파일의 타입은 실제 Supabase 데이터베이스 스키마와 정확히 일치합니다.
 * 데이터베이스 스키마가 변경되면 이 파일도 함께 업데이트해야 합니다.
 */

// ============================================================================
// Parts (부품)
// ============================================================================
export interface Part {
  part_id: string; // UUID
  part_code: string;
  part_name: string;
  vietnamese_name: string;
  korean_name: string;
  spec: string;
  unit: string;
  category: string;
  status: string;
  min_stock: number;
  description: string;
  created_at: string; // ISO 8601 timestamp
  created_by: string;
  updated_at: string; // ISO 8601 timestamp
  updated_by: string;
}

// ============================================================================
// Suppliers (공급업체)
// ============================================================================
export interface Supplier {
  supplier_id: string; // UUID
  supplier_code: string;
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  website: string;
  status: string;
  created_at: string; // ISO 8601 timestamp
  created_by: string;
  updated_at: string; // ISO 8601 timestamp
}

// ============================================================================
// Inventory (재고)
// ============================================================================
export interface Inventory {
  inventory_id: string; // UUID
  part_id: string; // UUID - parts 테이블과 연결
  current_quantity: number;
  last_count_date: string; // ISO 8601 timestamp
  location: string;
  updated_at: string; // ISO 8601 timestamp
  updated_by: string;
}

// ============================================================================
// Inbound (입고)
// ============================================================================
export interface Inbound {
  inbound_id: string; // UUID
  inbound_date: string; // YYYY-MM-DD 형식
  part_id: string; // UUID - parts 테이블과 연결
  supplier_id: string; // UUID - suppliers 테이블과 연결
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  notes: string;
  created_at: string; // ISO 8601 timestamp
  created_by: string;
  reference_number: string; // 입고 참조 번호 (예: IN-20250518-001)
  part_code: string; // 조인된 데이터
  part_name: string; // 조인된 데이터
  supplier_name: string; // 조인된 데이터
  part_unit: string; // 조인된 데이터
}

// ============================================================================
// Outbound (출고)
// ============================================================================
export interface Outbound {
  outbound_id: string; // UUID
  outbound_date: string; // YYYY-MM-DD 형식
  part_id: string; // UUID - parts 테이블과 연결
  quantity: number;
  requester: string;
  department: string | null;
  reason: string;
  equipment: string;
  notes: string;
  created_at: string; // ISO 8601 timestamp
  created_by: string;
  department_id: string | null; // UUID
  reference_number: string; // 출고 참조 번호 (예: OUT-20250608-019)
  part_code: string; // 조인된 데이터
  part_name: string; // 조인된 데이터
  department_name: string; // 조인된 데이터
  part_unit: string; // 조인된 데이터
}

// ============================================================================
// Departments (부서)
// ============================================================================
export interface Department {
  department_id: string; // UUID
  department_code: string;
  department_name: string;
  description: string | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

// ============================================================================
// Part Prices (부품 단가)
// ============================================================================
export interface PartPrice {
  price_id: string; // UUID
  part_id: string; // UUID - parts 테이블과 연결
  unit_price: number;
  currency: string; // '₫', '$', '￥'
  supplier_id: string | null; // UUID - suppliers 테이블과 연결 (nullable)
  effective_from: string; // YYYY-MM-DD 형식
  effective_to: string | null; // YYYY-MM-DD 형식
  is_current: boolean;
  created_at: string; // ISO 8601 timestamp
  created_by: string;
  // Joined data (not in DB, populated by service)
  supplier_name?: string;
  source?: 'part_prices' | 'inbound'; // 데이터 출처 구분
}

// ============================================================================
// Users (사용자)
// ============================================================================
export interface User {
  user_id: string; // UUID
  username: string;
  full_name: string;
  email: string;
  role: string; // 예: 'system_admin', 'user' 등
  department: string | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  profile_image_url: string | null;
  phone_number: string;
  position: string | null;
  last_password_change: string | null;
  login_attempt_count: number;
  account_expiry_date: string | null;
  user_settings: Record<string, unknown>; // JSON 객체
  password_hash: string; // ⚠️ 프론트엔드에서는 절대 사용하지 말 것
  is_active: boolean;
  department_id: string | null; // UUID
}

// ============================================================================
// 데이터베이스 전체 타입
// ============================================================================
export interface Database {
  public: {
    Tables: {
      parts: {
        Row: Part;
        Insert: Omit<Part, 'part_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Part, 'part_id' | 'created_at'>>;
      };
      suppliers: {
        Row: Supplier;
        Insert: Omit<Supplier, 'supplier_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Supplier, 'supplier_id' | 'created_at'>>;
      };
      departments: {
        Row: Department;
        Insert: Omit<Department, 'department_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Department, 'department_id' | 'created_at'>>;
      };
      inventory: {
        Row: Inventory;
        Insert: Omit<Inventory, 'inventory_id' | 'updated_at'>;
        Update: Partial<Omit<Inventory, 'inventory_id'>>;
      };
      inbound: {
        Row: Inbound;
        Insert: Omit<Inbound, 'inbound_id' | 'created_at' | 'reference_number' | 'part_code' | 'part_name' | 'supplier_name' | 'part_unit'>;
        Update: Partial<Omit<Inbound, 'inbound_id' | 'created_at' | 'reference_number'>>;
      };
      outbound: {
        Row: Outbound;
        Insert: Omit<Outbound, 'outbound_id' | 'created_at' | 'reference_number' | 'part_code' | 'part_name' | 'department_name' | 'part_unit'>;
        Update: Partial<Omit<Outbound, 'outbound_id' | 'created_at' | 'reference_number'>>;
      };
      part_prices: {
        Row: PartPrice;
        Insert: Omit<PartPrice, 'price_id' | 'created_at' | 'supplier_name' | 'source'> & { effective_to?: string | null; is_current?: boolean };
        Update: Partial<Omit<PartPrice, 'price_id' | 'created_at' | 'supplier_name' | 'source'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'user_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'user_id' | 'created_at'>>;
      };
    };
  };
}

// ============================================================================
// 유틸리티 타입
// ============================================================================

// 테이블 Row 타입 추출
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

// 테이블 Insert 타입 추출
export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

// 테이블 Update 타입 추출
export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// ============================================================================
// 확장 타입 (조인된 데이터 포함)
// ============================================================================

// 재고 상세 정보 (부품 정보 포함)
export interface InventoryWithPart extends Inventory {
  part?: Part;
}

// 입고 상세 정보 (부품 및 공급업체 정보 포함)
export interface InboundDetail extends Inbound {
  part?: Part;
  supplier?: Supplier;
}

// 출고 상세 정보 (부품 정보 포함)
export interface OutboundDetail extends Outbound {
  part?: Part;
}

// ============================================================================
// 열거형 (Enum) 타입
// ============================================================================

// 부품 상태
export const PartStatus = {
  NEW: 'NEW',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DISCONTINUED: 'DISCONTINUED',
} as const;

export type PartStatusType = typeof PartStatus[keyof typeof PartStatus];

// 공급업체 상태
export const SupplierStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type SupplierStatusType = typeof SupplierStatus[keyof typeof SupplierStatus];

// 사용자 역할
export const UserRole = {
  SYSTEM_ADMIN: 'system_admin',
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];
