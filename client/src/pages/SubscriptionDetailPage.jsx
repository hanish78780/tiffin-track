import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Phone,
  User,
  PauseCircle,
  PlayCircle,
  Receipt,
  History,
  Clock
} from "lucide-react";
import { subscriptionService } from "../services/subscriptionService";
import { billingService } from "../services/billingService";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import StatusBadge from "../components/common/StatusBadge";
import ErrorState from "../components/common/ErrorState";
import { CardSkeleton } from "../components/common/LoadingSkeleton";
import PauseModal from "../components/subscriptions/PauseModal";
import ResumeModal from "../components/subscriptions/ResumeModal";

const SubscriptionDetailPage = () => {
  const { id } = useParams();

  const [subscription, setSubscription] = useState(null);
  const [pausePeriods, setPausePeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  const fetchSubscriptionDetails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await subscriptionService.getSubscriptionById(id);
      const sub = data.subscription;
      setSubscription(sub);

      // Fetch billing for the current month or check if pausePeriods returned
      if (data.pausePeriods) {
        setPausePeriods(data.pausePeriods);
      } else if (sub.customerId?._id || sub.customerId) {
        // Retrieve pause periods from billing endpoint
        const custId = sub.customerId?._id || sub.customerId;
        const currentMonth = new Date().toISOString().slice(0, 7);
        try {
          const billData = await billingService.getBill(custId, currentMonth);
          if (billData.pausePeriods) {
            setPausePeriods(billData.pausePeriods);
          }
        } catch (e) {
          // If billing fails (e.g. invalid month or fresh subscription), that's fine
        }
      }
    } catch (err) {
      console.error("Failed to load subscription details:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Subscription not found."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSubscriptionDetails();
  }, [fetchSubscriptionDetails]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <CardSkeleton lines={4} />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Link
          to="/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subscriptions</span>
        </Link>
        <ErrorState
          title="Subscription Not Found"
          message={error || "Could not find subscription record."}
          onRetry={fetchSubscriptionDetails}
        />
      </div>
    );
  }

  const cust = subscription.customerId || {};
  const currentOpenPause = pausePeriods.find((p) => !p.endDate);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link
          to="/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subscriptions</span>
        </Link>

        <div className="flex items-center gap-2">
          {cust._id && (
            <Link to={`/billing?customerId=${cust._id}`}>
              <Button variant="primary" size="sm" icon={Receipt}>
                Calculate Bill
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Subscription Card */}
      <Card
        title={subscription.planName}
        subtitle="Monthly lunch subscription plan"
        action={<StatusBadge status={subscription.status} />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Monthly Plan Fee
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{subscription.monthlyPrice.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Start Date
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {new Date(subscription.startDate).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Delivery Schedule
              </span>
              <p className="text-sm font-semibold text-emerald-800 mt-1">
                Every Weekday (Mon–Fri)
              </p>
            </div>
          </div>

          {/* Customer info block */}
          {cust.name && (
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <Link
                    to={`/customers/${cust._id}`}
                    className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                  >
                    {cust.name}
                  </Link>
                  <p className="text-xs text-slate-500 font-mono">{cust.phone}</p>
                </div>
              </div>
              <Link to={`/customers/${cust._id}`}>
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
              </Link>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {subscription.status === "active"
                ? "Active: Deliveries are ongoing."
                : "Paused: Weekdays excluded from billing."}
            </span>

            <div className="flex items-center gap-2">
              {subscription.status === "active" ? (
                <Button
                  variant="amber"
                  size="md"
                  icon={PauseCircle}
                  onClick={() => setPauseModalOpen(true)}
                >
                  Pause Deliveries
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  icon={PlayCircle}
                  onClick={() => setResumeModalOpen(true)}
                >
                  Resume Deliveries
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Pause History Card */}
      <Card
        title="Pause History"
        subtitle="Recorded holiday and travel pauses for this customer"
      >
        {pausePeriods.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No pause periods recorded for this subscription yet.
          </div>
        ) : (
          <div className="space-y-2">
            {pausePeriods.map((pause, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      pause.endDate ? "bg-slate-400" : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-800">
                      {new Date(pause.startDate).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                    <span className="text-slate-400 mx-1.5">→</span>
                    <span className="font-semibold text-slate-800">
                      {pause.endDate
                        ? new Date(pause.endDate).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })
                        : "Ongoing (currently paused)"}
                    </span>
                  </div>
                </div>

                {pause.reason && (
                  <span className="text-slate-500 italic bg-white px-2 py-0.5 rounded border border-slate-200/60 max-w-xs truncate">
                    Reason: {pause.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modals */}
      <PauseModal
        isOpen={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        subscription={subscription}
        onSuccess={fetchSubscriptionDetails}
      />

      <ResumeModal
        isOpen={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        subscription={subscription}
        currentPause={currentOpenPause}
        onSuccess={fetchSubscriptionDetails}
      />
    </div>
  );
};

export default SubscriptionDetailPage;
