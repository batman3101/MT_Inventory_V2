"""
Supabase에 CSV 데이터를 가져오는 스크립트
"""
import os
import pandas as pd
import sys
from supabase import create_client, Client

# 프로젝트 루트 경로 추가
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)

# Supabase 클라이언트 가져오기
from database.supabase_client import supabase

def import_users(file_path):
    """사용자 데이터 가져오기"""
    df = pd.read_csv(file_path)
    
    # 비밀번호 해시화 처리
    # 실제 환경에서는 bcrypt 등을 사용하여 해시화 필요
    
    for _, row in df.iterrows():
        data = {
            'username': row['username'],
            'full_name': row['full_name'],
            'email': row['email'],
            'password_hash': row['password'],  # 실제로는 해시화 필요
            'role': row['role'],
            'department': row['department'],
            'is_active': row['is_active'] == 'TRUE'
        }
        
        print(f"사용자 추가: {data['username']}")
        result = supabase().table('users').insert(data).execute()
        print(f"결과: {result.data}")

def import_suppliers(file_path):
    """공급업체 데이터 가져오기"""
    df = pd.read_csv(file_path)
    
    for _, row in df.iterrows():
        data = {
            'supplier_code': row['supplier_code'],
            'supplier_name': row['supplier_name'],
            'contact_person': row['contact_person'],
            'email': row['email'],
            'phone': row['phone'],
            'address': row['address'],
            'country': row['country'],
            'website': row['website'],
            'status': row['status'],
            'created_by': row['created_by']
        }
        
        print(f"공급업체 추가: {data['supplier_name']}")
        result = supabase().table('suppliers').insert(data).execute()
        print(f"결과: {result.data}")

def import_parts(file_path):
    """부품 데이터 가져오기"""
    df = pd.read_csv(file_path)
    
    for _, row in df.iterrows():
        data = {
            'part_code': row['part_code'],
            'part_name': row['part_name'],
            'vietnamese_name': row['vietnamese_name'],
            'korean_name': row['korean_name'],
            'spec': row['spec'],
            'unit': row['unit'],
            'category': row['category'],
            'status': row['status'],
            'min_stock': int(row['min_stock']),
            'description': row['description'],
            'created_by': row['created_by']
        }
        
        print(f"부품 추가: {data['part_name']}")
        result = supabase().table('parts').insert(data).execute()
        print(f"결과: {result.data}")

def import_korean_names(file_path):
    """한국어 이름 매핑 데이터 가져오기"""
    df = pd.read_csv(file_path)
    
    for _, row in df.iterrows():
        data = {
            'english_name': row['english_name'],
            'korean_name': row['korean_name'],
            'vietnamese_name': row['vietnamese_name']
        }
        
        print(f"다국어 매핑 추가: {data['english_name']}")
        result = supabase().table('korean_names').insert(data).execute()
        print(f"결과: {result.data}")

def get_part_id(part_code):
    """부품 코드로 ID 조회"""
    result = supabase().table('parts').select('part_id').eq('part_code', part_code).execute()
    if result.data:
        return result.data[0]['part_id']
    return None

def get_supplier_id(supplier_code):
    """공급업체 코드로 ID 조회"""
    result = supabase().table('suppliers').select('supplier_id').eq('supplier_code', supplier_code).execute()
    if result.data:
        return result.data[0]['supplier_id']
    return None

def import_part_prices(file_path):
    """부품 가격 데이터 가져오기"""
    df = pd.read_csv(file_path)
    
    for _, row in df.iterrows():
        part_id = get_part_id(row['part_code'])
        supplier_id = get_supplier_id(row['supplier_code'])
        
        if not part_id or not supplier_id:
            print(f"오류: 부품({row['part_code']}) 또는 공급업체({row['supplier_code']})를 찾을 수 없습니다.")
            continue
        
        data = {
            'part_id': part_id,
            'supplier_id': supplier_id,
            'unit_price': float(row['unit_price']),
            'currency': row['currency'],
            'effective_from': row['effective_from'],
            'is_current': row['is_current'] == 'TRUE',
            'created_by': row['created_by']
        }
        
        print(f"가격 추가: {row['part_code']} - {row['supplier_code']}")
        result = supabase().table('part_prices').insert(data).execute()
        print(f"결과: {result.data}")

def import_inventory(file_path):
    """재고 데이터 가져오기"""
    df = pd.read_csv(file_path)
    
    for _, row in df.iterrows():
        part_id = get_part_id(row['part_code'])
        
        if not part_id:
            print(f"오류: 부품({row['part_code']})을 찾을 수 없습니다.")
            continue
        
        data = {
            'part_id': part_id,
            'current_quantity': int(row['current_quantity']),
            'last_count_date': row['last_count_date'],
            'location': row['location'],
            'updated_by': row['updated_by']
        }
        
        print(f"재고 추가: {row['part_code']}")
        result = supabase().table('inventory').insert(data).execute()
        print(f"결과: {result.data}")

def import_inbound(file_path):
    """입고 데이터 가져오기"""
    df = pd.read_csv(file_path)
    
    for _, row in df.iterrows():
        part_id = get_part_id(row['part_code'])
        supplier_id = get_supplier_id(row['supplier_code'])
        
        if not part_id or not supplier_id:
            print(f"오류: 부품({row['part_code']}) 또는 공급업체({row['supplier_code']})를 찾을 수 없습니다.")
            continue
        
        data = {
            'inbound_date': row['inbound_date'],
            'part_id': part_id,
            'supplier_id': supplier_id,
            'quantity': int(row['quantity']),
            'unit_price': float(row['unit_price']),
            'total_price': float(row['total_price']),
            'currency': row['currency'],
            'invoice_number': row['invoice_number'],
            'lot_number': row['lot_number'],
            'notes': row['notes'],
            'created_by': row['created_by']
        }
        
        print(f"입고 추가: {row['part_code']} - {row['quantity']}개")
        result = supabase().table('inbound').insert(data).execute()
        print(f"결과: {result.data}")
        
        # 재고량 업데이트
        # 실제로는 트리거나 함수를 사용하는 것이 좋음

def import_outbound(file_path):
    """출고 데이터 가져오기"""
    df = pd.read_csv(file_path)
    
    for _, row in df.iterrows():
        part_id = get_part_id(row['part_code'])
        
        if not part_id:
            print(f"오류: 부품({row['part_code']})을 찾을 수 없습니다.")
            continue
        
        data = {
            'outbound_date': row['outbound_date'],
            'part_id': part_id,
            'quantity': int(row['quantity']),
            'requester': row['requester'],
            'department': row['department'],
            'reason': row['reason'],
            'equipment': row['equipment'],
            'notes': row['notes'],
            'created_by': row['created_by']
        }
        
        print(f"출고 추가: {row['part_code']} - {row['quantity']}개")
        result = supabase().table('outbound').insert(data).execute()
        print(f"결과: {result.data}")
        
        # 재고량 업데이트
        # 실제로는 트리거나 함수를 사용하는 것이 좋음

def main():
    """메인 함수"""
    templates_dir = os.path.join(ROOT_DIR, 'excel_templates')
    
    print("Supabase 데이터 가져오기 스크립트")
    print("============================")
    
    actions = {
        '1': ('사용자 데이터 가져오기', 'users_template.csv', import_users),
        '2': ('공급업체 데이터 가져오기', 'suppliers_template.csv', import_suppliers),
        '3': ('부품 데이터 가져오기', 'parts_template.csv', import_parts),
        '4': ('한국어 이름 매핑 가져오기', 'korean_names_template.csv', import_korean_names),
        '5': ('부품 가격 데이터 가져오기', 'part_prices_template.csv', import_part_prices),
        '6': ('재고 데이터 가져오기', 'inventory_template.csv', import_inventory),
        '7': ('입고 데이터 가져오기', 'inbound_template.csv', import_inbound),
        '8': ('출고 데이터 가져오기', 'outbound_template.csv', import_outbound),
    }
    
    # 메뉴 표시
    for key, (desc, _, _) in actions.items():
        print(f"{key}. {desc}")
    
    choice = input("작업을 선택하세요 (종료: q): ")
    
    if choice in actions:
        desc, file_name, func = actions[choice]
        file_path = os.path.join(templates_dir, file_name)
        
        if not os.path.exists(file_path):
            print(f"오류: {file_name} 파일을 찾을 수 없습니다.")
            return
        
        try:
            print(f"\n{desc} 시작...")
            func(file_path)
            print(f"{desc} 완료!")
        except Exception as e:
            print(f"오류 발생: {str(e)}")
    
    elif choice.lower() == 'q':
        print("프로그램을 종료합니다.")
    else:
        print("잘못된 선택입니다.")

if __name__ == "__main__":
    main() 