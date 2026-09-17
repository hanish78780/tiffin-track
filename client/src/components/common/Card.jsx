import React from "react";

const Card = ({
  children,
  title,
  subtitle,
  action,
  className = "",
  bodyClassName = "p-6",
  headerClassName = "px-6 py-4 border-b border-slate-100",
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-shadow hover:shadow-md ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className={`flex items-center justify-between gap-4 ${headerClassName}`}>
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
};

export default Card;
