import React from "react";

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="w-full animate-pulse divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5 px-6">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-slate-200 rounded"
              style={{ width: `${Math.floor(60 + ((i + j) % 4) * 15)}px`, flex: j === 0 ? 1.5 : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ lines = 4 }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 bg-slate-100 rounded"
            style={{ width: `${100 - (i % 3) * 20}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export const BillingSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm animate-pulse max-w-xl mx-auto">
      <div className="h-6 bg-slate-200 rounded w-1/2 mx-auto mb-6"></div>
      <div className="space-y-4">
        <div className="flex justify-between py-2 border-b border-slate-100">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="h-4 bg-slate-200 rounded w-16"></div>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <div className="h-4 bg-slate-200 rounded w-28"></div>
          <div className="h-4 bg-slate-200 rounded w-12"></div>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="h-4 bg-slate-200 rounded w-16"></div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl mt-4">
          <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
          <div className="h-8 bg-slate-300 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
};

export default { TableSkeleton, CardSkeleton, BillingSkeleton };
