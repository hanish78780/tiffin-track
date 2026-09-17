import React from "react";
import { Link } from "react-router-dom";
import { Calendar, User, Phone, Receipt, PlusCircle, CheckCircle2, AlertCircle } from "lucide-react";
import Button from "../common/Button";

const formatMonthName = (monthStr) => {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, m] = monthStr.split("-");
  const date = new Date(Date.UTC(parseInt(year, 10), parseInt(m, 10) - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

const BillingCard = ({ billData, customerId, onOpenCreateSub }) => {
  if (!billData) return null;

  const { customer, subscription, billing, pausePeriods } = billData;
  const isFullMonthServed = billing.pausedDays === 0 && billing.servedDays > 0;
  const isEntireMonthPaused = billing.servedDays === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden animate-fade-in max-w-2xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">{customer.name}</h3>
              <div className="flex items-center gap-2 text-xs text-emerald-200">
                <Phone className="w-3.5 h-3.5" />
                <span>{customer.phone}</span>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-xs font-semibold text-white">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatMonthName(billing.month)}</span>
          </div>
        </div>
      </div>

      {/* Main Billing Table & Metrics */}
      <div className="p-6 space-y-6">
        {/* Status Callout */}
        {isEntireMonthPaused && (
          <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>No delivery days this month — the subscription was fully paused.</span>
          </div>
        )}

        {isFullMonthServed && (
          <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Full month served — no pause periods recorded.</span>
          </div>
        )}

        {/* Breakdown Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Plan Price
            </span>
            <p className="text-base font-bold text-slate-900 mt-1">
              ₹{billing.monthlyPrice.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Weekdays
            </span>
            <p className="text-base font-bold text-slate-900 mt-1">
              {billing.totalWeekdays} days
            </p>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Paused Days
            </span>
            <p className="text-base font-bold text-amber-900 mt-1">
              {billing.pausedDays} days
            </p>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Served Days
            </span>
            <p className="text-base font-bold text-emerald-900 mt-1">
              {billing.servedDays} days
            </p>
          </div>
        </div>

        {/* Detailed calculation rows */}
        <div className="divide-y divide-slate-100 text-sm">
          <div className="flex justify-between py-2.5 text-slate-600">
            <span>Subscription Plan</span>
            <span className="font-semibold text-slate-900">{subscription.planName}</span>
          </div>

          <div className="flex justify-between py-2.5 text-slate-600">
            <span>Daily Weekday Rate (Plan ÷ Weekdays)</span>
            <span className="font-mono font-medium text-slate-800">
              ₹{billing.dailyRate.toFixed(2)} / day
            </span>
          </div>

          <div className="flex justify-between py-2.5 text-slate-600">
            <span>Actual Delivery Days Served</span>
            <span className="font-semibold text-slate-900">
              {billing.servedDays} of {billing.totalWeekdays} weekdays
            </span>
          </div>
        </div>

        {/* Prominent Final Bill Box */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Final Pro-Rated Bill
            </span>
            <p className="text-xs text-slate-300 mt-0.5">
              Charge for {billing.servedDays} weekdays delivered in {formatMonthName(billing.month)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              ₹{billing.totalBill.toFixed(2)}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 text-center italic">
          * This bill is calculated from the weekdays actually served during the selected month.
        </p>

        {/* Pause History for this month if any */}
        {pausePeriods && pausePeriods.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Recorded Pause Periods ({pausePeriods.length})
            </h4>
            <div className="space-y-1.5">
              {pausePeriods.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>
                      {new Date(p.startDate).toISOString().slice(0, 10)}
                      {" → "}
                      {p.endDate
                        ? new Date(p.endDate).toISOString().slice(0, 10)
                        : "Ongoing (open pause)"}
                    </span>
                  </div>
                  {p.reason && (
                    <span className="text-slate-500 italic max-w-[150px] truncate">
                      {p.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingCard;
