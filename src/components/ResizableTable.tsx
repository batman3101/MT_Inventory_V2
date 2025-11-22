/**
 * Resizable Table Component
 *
 * Ant Design Table with resizable columns
 */

import { useState, useEffect } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface ResizableTableProps<T> extends TableProps<T> {
  columns: ColumnsType<T>;
}

interface ResizableTitleProps {
  onResize?: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
  width?: number;
  [key: string]: unknown;
}

// Resizable Title Component
const ResizableTitle = (props: ResizableTitleProps) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

export function ResizableTable<T extends Record<string, unknown>>({
  columns,
  ...restProps
}: ResizableTableProps<T>) {
  const [resizableColumns, setResizableColumns] = useState(columns);

  // columns prop이 변경되면 resizableColumns 업데이트
  // 데이터 로드 후 필터 옵션이 동적으로 추가되는 경우를 처리
  useEffect(() => {
    setResizableColumns(columns);
  }, [columns]);

  const handleResize =
    (index: number) =>
    (_: React.SyntheticEvent, { size }: { size: { width: number } }) => {
      const newColumns = [...resizableColumns];
      newColumns[index] = {
        ...newColumns[index],
        width: size.width,
      };
      setResizableColumns(newColumns);
    };

  const mergedColumns = resizableColumns.map((col, index) => ({
    ...col,
    onHeaderCell: (column: { width?: number }) => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

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
