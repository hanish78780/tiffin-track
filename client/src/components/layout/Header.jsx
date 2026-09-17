import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Plus, UserCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";

const routeTitles = {
  "/dashboard": "Dashboard",
  "/customers": "Customers",
  "/customers/new": "New Customer",
  "/subscriptions": "Subscriptions",
  "/subscriptions/new": "New Subscription",
  "/billing": "Monthly Billing"
};

const Header = ({ onOpenMobile }) => {
  const { user } = useAuth();
  const location = useLocation();

  const currentTitle =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith("/customers/") && "Customer Details") ||
    (location.pathname.startsWith("/subscriptions/") && "Subscription Details") ||
    "TiffinTrack";

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {currentTitle}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick action button */}
        <Link to="/customers/new">
          <Button variant="primary" size="sm" icon={Plus}>
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </Link>

        {/* User avatar badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center border border-emerald-300">
            {user?.name ? user.name.charAt(0).toUpperCase() : "O"}
          </div>
          <span className="hidden md:inline text-xs font-semibold text-slate-700 max-w-[120px] truncate">
            {user?.name || "Owner"}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
