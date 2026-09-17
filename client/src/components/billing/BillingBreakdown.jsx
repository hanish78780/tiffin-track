import React from "react";
import { ArrowRight, Divide, Equal, X } from "lucide-react";

const BillingBreakdown = ({ billing }) => {
  if (!billing) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs max-w-2xl mx-auto mt-6">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 text-center">
        Step-by-Step Billing Formula
      </h4>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
        {/* Step 1: Monthly Price */}
        <div className="flex flex-col items-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl min-w-[90px]">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Plan Price</span>
          <span className="font-bold text-slate-800 mt-0.5">₹{billing.monthlyPrice}</span>
        </div>

        <span className="font-bold text-slate-400 text-base">÷</span>

        {/* Step 2: Weekdays */}
        <div className="flex flex-col items-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl min-w-[90px]">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Weekdays</span>
          <span className="font-bold text-slate-800 mt-0.5">{billing.totalWeekdays} days</span>
        </div>

        <span className="font-bold text-slate-400 text-base">=</span>

        {/* Step 3: Daily Rate */}
        <div className="flex flex-col items-center p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl min-w-[90px]">
          <span className="text-[10px] uppercase font-semibold text-emerald-700">Daily Rate</span>
          <span className="font-bold text-emerald-900 mt-0.5">₹{billing.dailyRate}</span>
        </div>

        <span className="font-bold text-slate-400 text-base">×</span>

        {/* Step 4: Served Days */}
        <div className="flex flex-col items-center p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl min-w-[100px]">
          <span className="text-[10px] uppercase font-semibold text-emerald-700">Served Days</span>
          <span className="font-bold text-emerald-900 mt-0.5">
            {billing.servedDays} ({billing.totalWeekdays} - {billing.pausedDays})
          </span>
        </div>

        <span className="font-bold text-slate-400 text-base">=</span>

        {/* Step 5: Final Bill */}
        <div className="flex flex-col items-center p-2.5 bg-slate-900 text-white rounded-xl min-w-[100px] shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-emerald-400">Final Bill</span>
          <span className="font-bold text-white mt-0.5">₹{billing.totalBill.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default BillingBreakdown;
