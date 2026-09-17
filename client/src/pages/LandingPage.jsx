import React from "react";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed,
  CalendarCheck2,
  Receipt,
  PauseCircle,
  Users,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";

const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                TiffinTrack
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                SaaS for Tiffin Services
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  Open Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-xs font-semibold text-emerald-800">
            <CalendarCheck2 className="w-4 h-4" />
            <span>Fair, Weekday-Only Subscription Billing</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Deliver Home-Style Lunches. <br className="hidden sm:inline" />
            <span className="text-emerald-700">Bill Only for Days Actually Served.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Customers pause for travel and festivals — they shouldn't pay for skipped lunches.
            TiffinTrack automatically pro-rates monthly subscriptions based on real weekdays delivered.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button variant="primary" size="lg" icon={ArrowRight}>
                Start Managing Your Tiffins
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Sign In to Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3-Step Core Workflow */}
      <section className="py-12 bg-white border-y border-slate-200/80 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
              How It Works
            </h2>
            <h3 className="text-2xl font-bold text-slate-900">
              The Owner's Everyday Workflow
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="text-base font-bold text-slate-900">Add Customer & Plan</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Save customer contact info and activate their monthly lunch plan with a custom price.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="text-base font-bold text-slate-900">Pause & Resume</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Going out of town? Pause with one click. Paused weekdays are tracked and subtracted automatically.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="text-base font-bold text-slate-900">Pro-Rated Month-End Bill</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select any month. The engine calculates weekdays, excludes pauses, and produces the accurate fair bill.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-xs text-slate-500 border-t border-slate-200">
        <p>© 2026 TiffinTrack. Modern backend and frontend for home-style lunch services.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
