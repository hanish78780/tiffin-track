import React from "react";
import { FolderOpen } from "lucide-react";
import Button from "./Button";

const EmptyState = ({
  icon: Icon = FolderOpen,
  title = "No data found",
  description = "Get started by creating a new entry.",
  actionLabel,
  onAction,
  className = ""
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
