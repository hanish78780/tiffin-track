import React from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Home } from "lucide-react";
import Button from "../components/common/Button";

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 shadow-sm">
        <UtensilsCrossed className="w-7 h-7" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
      <h2 className="text-xl font-bold text-slate-800 mt-2">Page Not Found</h2>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" size="md" icon={Home}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
