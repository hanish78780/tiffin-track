import React from "react";

const KpiCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  iconBgColor = "bg-emerald-50 text-emerald-700",
  loading = false,
  className = ""
}) => {
  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="h-8 bg-slate-200 rounded w-20 mt-4"></div>
        <div className="h-3 bg-slate-100 rounded w-32 mt-2"></div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </span>
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 font-medium">{subtitle}</p>
      )}
    </div>
  );
};

export default KpiCard;
