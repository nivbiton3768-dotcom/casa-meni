'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ResponsiveColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  primary?: boolean;
  className?: string;
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: ReactNode;
  className?: string;
}

export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = 'No data',
  className,
}: ResponsiveTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className={cn('hidden overflow-x-auto md:block', className)}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-gray-50',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-3 text-sm', col.className)}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cn('flex flex-col gap-3 md:hidden', className)}>
        {rows.map((row) => {
          const visibleColumns = columns.filter((c) => !c.hideOnMobile);
          const primary = visibleColumns.find((c) => c.primary) ?? visibleColumns[0];
          const rest = visibleColumns.filter((c) => c !== primary);
          return (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'rounded-lg border border-gray-100 bg-white p-4',
                onRowClick && 'cursor-pointer transition-colors active:bg-gray-50',
              )}
            >
              <div className="text-sm font-medium text-gray-900">
                {primary.cell(row)}
              </div>
              {rest.length > 0 && (
                <div className="mt-2 grid grid-cols-1 gap-1.5">
                  {rest.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-start justify-between gap-3 text-xs"
                    >
                      <span className="text-gray-500">
                        {col.mobileLabel ?? col.header}
                      </span>
                      <span className="text-right text-gray-900">
                        {col.cell(row)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
