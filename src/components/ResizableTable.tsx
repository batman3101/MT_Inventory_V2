import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Tooltip, theme } from 'antd';
import { FilterFilled } from '@ant-design/icons';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

const MIN_COL_WIDTH = 50;

interface ResizableTitleProps {
  onResize: (newWidth: number) => void;
  width?: number;
  children?: React.ReactNode;
  [key: string]: unknown;
}

const ResizableTitle = ({ onResize, width, children, ...restProps }: ResizableTitleProps) => {
  const thRef = useRef<HTMLTableCellElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const startWidth = thRef.current?.offsetWidth ?? width ?? 100;
      let dragged = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (Math.abs(moveEvent.clientX - startX) > 2) dragged = true;
        const newWidth = Math.max(MIN_COL_WIDTH, startWidth + (moveEvent.clientX - startX));
        onResize(newWidth);
      };

      const cleanup = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', cleanup);
        document.removeEventListener('pointercancel', cleanup);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (dragged) {
          // pointerup 직후 발생하는 click 이벤트가 정렬을 트리거하지 않도록 차단
          document.addEventListener('click', (ce) => {
            ce.stopPropagation();
            ce.preventDefault();
          }, { capture: true, once: true });
        }
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', cleanup);
      document.addEventListener('pointercancel', cleanup);
    },
    [width, onResize]
  );

  const incomingStyle = (restProps.style as React.CSSProperties) ?? {};

  return (
    <th
      ref={thRef}
      {...restProps}
      // position: 'relative'을 먼저 두어 sticky(고정 컬럼)가 우선 적용되도록 함
      style={{ position: 'relative', ...incomingStyle }}
    >
      {children}
      <span
        className="react-resizable-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label="컬럼 크기 조절"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 1,
          userSelect: 'none',
        }}
        onPointerDown={handlePointerDown}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  );
};

interface ResizableTableProps<T> extends TableProps<T> {
  columns: ColumnsType<T>;
}

const colKey = (col: { key?: React.Key; dataIndex?: unknown }, index: number): string =>
  String(col.key ?? col.dataIndex ?? index);

export function ResizableTable<T extends Record<string, unknown>>({
  columns,
  ...restProps
}: ResizableTableProps<T>) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  // 컬럼 key 기반으로 너비를 저장 — 부모 리렌더 시 사용자 조절 너비 유지
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  useEffect(() => {
    setColWidths((prev) => {
      const validKeys = new Set(columns.map((c, i) => colKey(c, i)));
      return Object.fromEntries(Object.entries(prev).filter(([k]) => validKeys.has(k)));
    });
  }, [columns]);

  const handleResize = useCallback(
    (key: string) => (newWidth: number) => {
      setColWidths((prev) => ({ ...prev, [key]: newWidth }));
    },
    []
  );

  const mergedColumns = columns.map((col, index) => {
    const key = colKey(col, index);
    const currentWidth = colWidths[key] ?? (typeof col.width === 'number' ? col.width : undefined);
    const hasFilter = 'filters' in col || 'filterDropdown' in col;
    const filterIcon = hasFilter && !('filterIcon' in col)
      ? (filtered: boolean) => (
          <Tooltip title={t('common.filter')}>
            <FilterFilled style={{ color: filtered ? token.colorPrimary : undefined }} />
          </Tooltip>
        )
      : undefined;
    return {
      ...col,
      width: currentWidth,
      ...(filterIcon ? { filterIcon } : {}),
      onHeaderCell: () => ({
        width: currentWidth,
        onResize: handleResize(key),
      }),
    };
  });

  return (
    <Table
      {...restProps}
      columns={mergedColumns}
      components={{
        header: {
          cell: ResizableTitle,
        },
      }}
    />
  );
}
