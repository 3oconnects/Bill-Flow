/**
 * Loading Skeleton Components
 * Placeholder UI while data is loading
 * Improves perceived performance
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

/**
 * Generic skeleton bar (shimmer effect)
 */
export function Skeleton({ className = 'h-4 w-full', count = 1 }: SkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${className} bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse`}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-3/4" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for table with multiple rows
 */
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton for card/invoice item
 */
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Content */}
      <div className="space-y-3 pt-4 border-t">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      {/* Footer */}
      <div className="flex justify-between pt-4 border-t">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton for form input
 */
export function FormInputSkeleton({ label = true, count = 1 }: { label?: boolean; count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {label && <Skeleton className="h-4 w-24 mb-2" />}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for dashboard widgets
 */
export function DashboardWidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Title */}
      <Skeleton className="h-5 w-32 mb-4" />

      {/* Number/Value */}
      <Skeleton className="h-8 w-40 mb-2" />

      {/* Subtitle */}
      <Skeleton className="h-4 w-28" />

      {/* Chart/Content */}
      <div className="mt-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for list items
 */
export function ListItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded p-4 flex items-center justify-between border">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for invoice detail page
 */
export function InvoiceDetailSkeleton() {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>

      {/* Line Items Table */}
      <TableSkeleton rows={5} columns={5} />

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for customer list page
 */
export function CustomerListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Skeleton className="h-10 w-64 rounded-md" />

      {/* Table */}
      <TableSkeleton rows={10} columns={6} />
    </div>
  );
}

/**
 * Skeleton for report page
 */
export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-40 rounded-md" />
        ))}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardWidgetSkeleton key={i} />
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-80 w-full rounded" />
      </div>

      {/* Data Table */}
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}

/**
 * Shimmer pulse animation (add to global CSS)
 * @keyframes shimmer {
 *   0% { background-position: -1000px 0; }
 *   100% { background-position: 1000px 0; }
 * }
 */
export const skeletonStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;
