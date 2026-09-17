import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "./Button";

const ErrorState = ({
  title = "Unable to load data",
  message = "Something went wrong. Please try again.",
  onRetry,
  className = ""
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-red-200/80 shadow-xs ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-red-600 max-w-sm mb-4 leading-relaxed font-medium">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
