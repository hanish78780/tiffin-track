import React from "react";

const StatusBadge = ({ status, className = "" }) => {
  const normalizedStatus = String(status || "").toLowerCase();
  const isActive = normalizedStatus === "active";
  const isPaused = normalizedStatus === "paused";

  if (isActive) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
        Active
      </span>
    );
  }

  if (isPaused) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Paused
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      {status || "Unknown"}
    </span>
  );
};

export default StatusBadge;
