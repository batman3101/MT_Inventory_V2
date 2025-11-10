/**
 * Resizable Table Component
 *
 * Ant Design Table with resizable columns
 */

import { useState } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface ResizableTableProps<T> extends TableProps<T> {
  columns: ColumnsType<T>;
}

// Resizable Title Component
const ResizableTitle = (props: any) => {
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

export function ResizableTable<T extends Record<string, any>>({
  columns,
  ...restProps
}: ResizableTableProps<T>) {
  const [resizableColumns, setResizableColumns] = useState(columns);

  const handleResize =
    (index: number) =>
    (_: any, { size }: any) => {
      const newColumns = [...resizableColumns];
      newColumns[index] = {
        ...newColumns[index],
        width: size.width,
      };
      setResizableColumns(newColumns);
    };

  const mergedColumns = resizableColumns.map((col, index) => ({
    ...col,
    onHeaderCell: (column: any) => ({
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
