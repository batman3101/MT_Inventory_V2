// 모의 데이터 생성 유틸리티

export interface InOutData {
  month: string;
  inbound: number;
  outbound: number;
  net: number;
}

export interface InboundDetail {
  id: number;
  part_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  inbound_date: string;
  supplier_name: string;
  created_by: string;
}

export interface OutboundDetail {
  id: number;
  part_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  outbound_date: string;
  purpose: string;
  created_by: string;
}

export interface InventoryAnalysis {
  category_name: string;
  part_count: number;
  total_quantity: number;
  total_value: number;
}

export interface CostAnalysis {
  month: string;
  inbound_cost: number;
  outbound_cost: number;
  net_cost: number;
}

// 월별 입출고 추이 모의 데이터
export const generateInOutData = (startDate?: string, endDate?: string): InOutData[] => {
  const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];
  return months.map(month => {
    const inbound = Math.floor(Math.random() * 500) + 100;
    const outbound = Math.floor(Math.random() * 400) + 80;
    return {
      month: new Date(month + '-01').toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' }),
      inbound,
      outbound,
      net: inbound - outbound
    };
  });
};

// 입고 상세 내역 모의 데이터
export const generateInboundDetails = (startDate?: string, endDate?: string, categoryId?: string): InboundDetail[] => {
  const partNames = ['볼트 M8x20', '너트 M8', '와셔 8mm', '스크류 M6x15', '베어링 6201', '오링 20x3', '가스켓 100x5'];
  const suppliers = ['삼성부품', 'LG공급', '현대자재', 'SK부품', '롯데공급'];
  const users = ['김철수', '이영희', '박민수', '정수진'];
  
  return Array.from({ length: 20 }, (_, index) => {
    const quantity = Math.floor(Math.random() * 100) + 10;
    const unitPrice = Math.floor(Math.random() * 100000) + 10000;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    return {
      id: index + 1,
      part_name: partNames[Math.floor(Math.random() * partNames.length)],
      quantity,
      unit_price: unitPrice,
      total_amount: quantity * unitPrice,
      inbound_date: date.toISOString().split('T')[0],
      supplier_name: suppliers[Math.floor(Math.random() * suppliers.length)],
      created_by: users[Math.floor(Math.random() * users.length)]
    };
  });
};

// 출고 상세 내역 모의 데이터
export const generateOutboundDetails = (startDate?: string, endDate?: string, categoryId?: string): OutboundDetail[] => {
  const partNames = ['볼트 M8x20', '너트 M8', '와셔 8mm', '스크류 M6x15', '베어링 6201', '오링 20x3', '가스켓 100x5'];
  const purposes = ['생산라인 A', '생산라인 B', '유지보수', '품질검사', '연구개발'];
  const users = ['김철수', '이영희', '박민수', '정수진'];
  
  return Array.from({ length: 15 }, (_, index) => {
    const quantity = Math.floor(Math.random() * 50) + 5;
    const unitPrice = Math.floor(Math.random() * 100000) + 10000;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    return {
      id: index + 1,
      part_name: partNames[Math.floor(Math.random() * partNames.length)],
      quantity,
      unit_price: unitPrice,
      total_amount: quantity * unitPrice,
      outbound_date: date.toISOString().split('T')[0],
      purpose: purposes[Math.floor(Math.random() * purposes.length)],
      created_by: users[Math.floor(Math.random() * users.length)]
    };
  });
};

// 재고 분석 모의 데이터
export const generateInventoryAnalysis = (): InventoryAnalysis[] => {
  const categories = [
    { name: '볼트/너트', color: '#8884d8' },
    { name: '베어링', color: '#82ca9d' },
    { name: '씰/가스켓', color: '#ffc658' },
    { name: '전자부품', color: '#ff7300' },
    { name: '기계부품', color: '#00ff00' }
  ];
  
  return categories.map(category => {
    const partCount = Math.floor(Math.random() * 50) + 10;
    const totalQuantity = Math.floor(Math.random() * 1000) + 200;
    const avgPrice = Math.floor(Math.random() * 60000) + 20000;
    
    return {
      category_name: category.name,
      part_count: partCount,
      total_quantity: totalQuantity,
      total_value: totalQuantity * avgPrice
    };
  });
};

// 비용 분석 모의 데이터
export const generateCostAnalysis = (startDate?: string, endDate?: string): CostAnalysis[] => {
  const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];
  return months.map(month => {
    const inboundCost = Math.floor(Math.random() * 100000000) + 20000000;
    const outboundCost = Math.floor(Math.random() * 80000000) + 16000000;
    return {
      month: new Date(month + '-01').toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' }),
      inbound_cost: inboundCost,
      outbound_cost: outboundCost,
      net_cost: inboundCost - outboundCost
    };
  });
};

// 대시보드 통계 모의 데이터
export const generateDashboardStats = () => {
  return {
    totalParts: Math.floor(Math.random() * 500) + 200,
    lowStockParts: Math.floor(Math.random() * 20) + 5,
    totalValue: Math.floor(Math.random() * 1000000000) + 200000000,
    recentInbound: Math.floor(Math.random() * 30) + 10,
    recentOutbound: Math.floor(Math.random() * 25) + 8
  };
};

// 최근 활동 모의 데이터
export const generateRecentActivities = () => {
  const partNames = ['볼트 M8x20', '너트 M8', '와셔 8mm', '스크류 M6x15', '베어링 6201'];
  const users = ['김철수', '이영희', '박민수', '정수진'];
  const types = ['inbound', 'outbound'];
  
  return Array.from({ length: 10 }, (_, index) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const date = new Date();
    date.setHours(date.getHours() - Math.floor(Math.random() * 48));
    
    return {
      id: index + 1,
      type,
      partName: partNames[Math.floor(Math.random() * partNames.length)],
      quantity: Math.floor(Math.random() * 50) + 5,
      date: date.toISOString(),
      user: users[Math.floor(Math.random() * users.length)]
    };
  });
};

// 재고 부족 항목 모의 데이터
export const generateLowStockItems = () => {
  const partNames = ['볼트 M8x20', '너트 M8', '와셔 8mm', '스크류 M6x15', '베어링 6201'];
  const categories = ['볼트/너트', '베어링', '씰/가스켓', '전자부품', '기계부품'];
  
  return Array.from({ length: 8 }, (_, index) => {
    const minStock = Math.floor(Math.random() * 50) + 20;
    const currentStock = Math.floor(Math.random() * minStock);
    
    return {
      id: index + 1,
      partName: partNames[Math.floor(Math.random() * partNames.length)],
      currentStock,
      minStock,
      category: categories[Math.floor(Math.random() * categories.length)]
    };
  });
};