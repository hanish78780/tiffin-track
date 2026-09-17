import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ReceiptText,
  LogOut,
  UtensilsCrossed
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Subscriptions", path: "/subscriptions", icon: CalendarDays },
  { label: "Billing", path: "/billing", icon: ReceiptText }
];

const Sidebar = ({ onCloseMobile }) => {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      {/* Brand logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
          <UtensilsCrossed className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-none">
            TiffinTrack
          </h1>
          <span className="text-[10px] font-medium tracking-wider text-emerald-400 uppercase">
            Service Owner
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-xs font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Owner Profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {user?.name || "Tiffin Owner"}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-red-600/80 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
