/**
 * 에러 메시지 번역 유틸리티
 *
 * 서비스에서 던지는 에러 코드를 i18n 번역 키로 변환합니다.
 */

import i18n from '../i18n/config';

// 에러 코드 상수
export const ERROR_CODES = {
  INVENTORY_NOT_FOUND: 'ERROR:inventoryNotFound',
  INVENTORY_NOT_FOUND_FOR_INBOUND: 'ERROR:inventoryNotFoundForInbound',
  INSUFFICIENT_STOCK: 'ERROR:insufficientStock',
  PART_NOT_FOUND: 'ERROR:partNotFound',
  INBOUND_CREATE_FAILED: 'ERROR:inboundCreateFailed',
  INBOUND_UPDATE_FAILED: 'ERROR:inboundUpdateFailed',
  INBOUND_DELETE_FAILED: 'ERROR:inboundDeleteFailed',
  OUTBOUND_CREATE_FAILED: 'ERROR:outboundCreateFailed',
  OUTBOUND_UPDATE_FAILED: 'ERROR:outboundUpdateFailed',
  OUTBOUND_DELETE_FAILED: 'ERROR:outboundDeleteFailed',
  INVENTORY_CREATE_FAILED: 'ERROR:inventoryCreateFailed',
  HAS_INBOUND_HISTORY: 'ERROR:hasInboundHistory',
  HAS_OUTBOUND_HISTORY: 'ERROR:hasOutboundHistory',
} as const;

// 에러 코드와 i18n 키 매핑
const errorCodeToI18nKey: Record<string, string> = {
  'inventoryNotFound': 'errors.inventoryNotFound',
  'inventoryNotFoundForInbound': 'errors.inventoryNotFoundForInbound',
  'insufficientStock': 'errors.insufficientStock',
  'partNotFound': 'errors.partNotFound',
  'inboundCreateFailed': 'errors.inboundCreateFailed',
  'inboundUpdateFailed': 'errors.inboundUpdateFailed',
  'inboundDeleteFailed': 'errors.inboundDeleteFailed',
  'outboundCreateFailed': 'errors.outboundCreateFailed',
  'outboundUpdateFailed': 'errors.outboundUpdateFailed',
  'outboundDeleteFailed': 'errors.outboundDeleteFailed',
  'inventoryCreateFailed': 'errors.inventoryCreateFailed',
  'hasInboundHistory': 'errors.hasInboundHistory',
  'hasOutboundHistory': 'errors.hasOutboundHistory',
};

interface ErrorParams {
  current?: number;
  required?: number;
  [key: string]: string | number | undefined;
}

/**
 * 에러 메시지를 번역합니다.
 * 에러 코드(ERROR:xxx) 형식이면 i18n으로 번역하고, 아니면 원본 메시지를 반환합니다.
 *
 * @param errorMessage 에러 메시지 또는 에러 코드
 * @param params 번역에 사용할 파라미터
 * @returns 번역된 에러 메시지
 */
export function translateError(errorMessage: string, params?: ErrorParams): string {
  // ERROR:코드:파라미터 형식 파싱 (예: ERROR:insufficientStock:10:5)
  if (errorMessage.startsWith('ERROR:')) {
    const parts = errorMessage.split(':');
    const errorCode = parts[1];
    const i18nKey = errorCodeToI18nKey[errorCode];

    if (i18nKey) {
      // insufficientStock의 경우 파라미터 추출
      if (errorCode === 'insufficientStock' && parts.length >= 4) {
        return i18n.t(i18nKey, {
          current: parts[2],
          required: parts[3],
        });
      }
      return i18n.t(i18nKey, params);
    }
  }

  // 한국어 에러 메시지 패턴 매칭 (레거시 지원)
  const koreanPatterns: Array<{ pattern: RegExp; key: string; extractor?: (match: RegExpMatchArray) => ErrorParams }> = [
    {
      pattern: /재고 레코드가 없습니다\. 해당 부품의 입고 처리를 먼저 진행해주세요\./,
      key: 'errors.inventoryNotFound',
    },
    {
      pattern: /재고 레코드가 없습니다\. 먼저 입고 처리를 해주세요\./,
      key: 'errors.inventoryNotFoundForInbound',
    },
    {
      pattern: /재고 수량이 부족합니다\. 현재 재고: (\d+), 필요 수량: (\d+)/,
      key: 'errors.insufficientStock',
      extractor: (match) => ({ current: parseInt(match[1]), required: parseInt(match[2]) }),
    },
    {
      pattern: /부품 ID .+에 해당하는 재고를 찾을 수 없습니다\./,
      key: 'errors.inventoryNotFound',
    },
    {
      pattern: /입고 내역이 있는 부품은 삭제할 수 없습니다/,
      key: 'errors.hasInboundHistory',
    },
    {
      pattern: /출고 내역이 있는 부품은 삭제할 수 없습니다/,
      key: 'errors.hasOutboundHistory',
    },
    {
      pattern: /재고 레코드 생성 실패/,
      key: 'errors.inventoryCreateFailed',
    },
  ];

  for (const { pattern, key, extractor } of koreanPatterns) {
    const match = errorMessage.match(pattern);
    if (match) {
      const extractedParams = extractor ? extractor(match) : undefined;
      return i18n.t(key, extractedParams);
    }
  }

  // 매칭되지 않으면 원본 메시지 반환
  return errorMessage;
}

/**
 * 에러 코드를 생성합니다 (서비스에서 사용)
 */
export function createErrorCode(code: keyof typeof ERROR_CODES, params?: ErrorParams): string {
  const errorCode = ERROR_CODES[code];
  if (params) {
    if (code === 'INSUFFICIENT_STOCK' && params.current !== undefined && params.required !== undefined) {
      return `${errorCode}:${params.current}:${params.required}`;
    }
  }
  return errorCode;
}
