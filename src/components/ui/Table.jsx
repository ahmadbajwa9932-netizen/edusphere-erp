"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Table({ columns, children, isLoading, isEmpty, emptyIcon: EmptyIcon, emptyText = "No records found", emptySubtext = "Try adjusting your search or filters" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`text-left text-[11px] font-medium text-gray-400 px-4 py-3 uppercase tracking-wider whitespace-nowrap ${i === 0 ? "pl-5" : ""}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {columns.map((_, j) => (
                    <td key={j} className={`px-4 py-3.5 ${j === 0 ? "pl-5" : ""}`}>
                      <div
                        className="h-3.5 bg-gray-100 rounded-md animate-pulse"
                        style={{ width: `${50 + (j * 13 + i * 7) % 40}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    {EmptyIcon && <EmptyIcon size={30} className="text-gray-200" />}
                    <p className="text-[13px] text-gray-400">{emptyText}</p>
                    <p className="text-[11px] text-gray-300">{emptySubtext}</p>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Tr({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-gray-50 hover:bg-gray-50/40 transition-colors ${onClick ? "cursor-pointer" : ""}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = "", first = false }) {
  return (
    <td className={`px-4 py-3 text-[13px] text-gray-600 ${first ? "pl-5" : ""} ${className}`}>
      {children}
    </td>
  );
}

export function TableFooter({ page, totalPages, total, label = "records", onPageChange }) {
    if (!totalPages || totalPages <= 1) return null;
  
    const getPages = () => {
      const pages = [];
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, start + 4);
      if (end - start < 4) start = Math.max(1, end - 4);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    };
  
    const btnCls = "h-7 min-w-[28px] px-2 rounded-lg text-[12px] font-medium transition-colors border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed";
    const activeCls = "bg-indigo-600 text-white border-indigo-600";
  
    return (
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
        <p className="text-[12px] text-gray-400">
          Page {page} of {totalPages} &mdash; {total} {label} total
        </p>
        <div className="flex items-center gap-1.5">
  
          <button onClick={() => onPageChange(1)} disabled={page === 1} className={btnCls}>
            First
          </button>
          <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className={btnCls}>
            <ChevronLeft size={13} />
          </button>
  
          {getPages().map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btnCls} ${page === p ? activeCls : ""}`}
            >
              {p}
            </button>
          ))}
  
          <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className={btnCls}>
            <ChevronRight size={13} />
          </button>
          <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages} className={btnCls}>
            Last
          </button>
  
        </div>
      </div>
    );
  }