import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Plus,
  Phone,
  Calendar,
  PauseCircle,
  PlayCircle,
  ExternalLink
} from "lucide-react";
import { subscriptionService } from "../services/subscriptionService";
import Button from "../components/common/Button";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { TableSkeleton } from "../components/common/LoadingSkeleton";
import Pagination from "../components/common/Pagination";
import PauseModal from "../components/subscriptions/PauseModal";
import ResumeModal from "../components/subscriptions/ResumeModal";

const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState(""); // "" for all, "active", "paused"
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [selectedSubForPause, setSelectedSubForPause] = useState(null);
  const [selectedSubForResume, setSelectedSubForResume] = useState(null);

  const fetchSubscriptions = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: pagination.limit,
        sort: "createdAt",
        order: "desc"
      };
      if (statusFilter) {
        params.status = statusFilter;
      }

      const data = await subscriptionService.getSubscriptions(params);
      setSubscriptions(data.subscriptions || []);
      setPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to load subscriptions."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.limit]);

  useEffect(() => {
    fetchSubscriptions(1);
  }, [fetchSubscriptions]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscriptions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor active delivery plans and manage paused periods.
          </p>
        </div>
        <Link to="/subscriptions/new">
          <Button variant="primary" size="md" icon={Plus}>
            New Subscription
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            statusFilter === ""
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          All Subscriptions
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("active")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            statusFilter === "active"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Active Only
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("paused")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            statusFilter === "paused"
              ? "border-amber-600 text-amber-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Paused Only
        </button>
      </div>

      {/* Error state */}
      {error && (
        <ErrorState
          title="Could not load subscriptions"
          message={error}
          onRetry={() => fetchSubscriptions(pagination.page)}
        />
      )}

      {/* Subscriptions Table */}
      {!error && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : subscriptions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No subscriptions found"
                description={
                  statusFilter
                    ? `No ${statusFilter} subscriptions found.`
                    : "No subscription plans created yet. Add a subscription to start managing deliveries."
                }
                actionLabel="+ Create Subscription"
                onAction={() => (window.location.href = "/subscriptions/new")}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-6 py-3.5">Plan Name</th>
                      <th className="px-6 py-3.5">Monthly Price</th>
                      <th className="px-6 py-3.5">Start Date</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptions.map((sub) => {
                      const cust = sub.customerId || {};
                      return (
                        <tr
                          key={sub._id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <Link
                              to={`/customers/${cust._id}`}
                              className="font-semibold text-slate-900 hover:text-emerald-700 transition-colors block"
                            >
                              {cust.name || "Unknown Customer"}
                            </Link>
                            {cust.phone && (
                              <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {cust.phone}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-800">
                            {sub.planName}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            ₹{sub.monthlyPrice.toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            {new Date(sub.startDate).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={sub.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {sub.status === "active" ? (
                                <Button
                                  variant="amber"
                                  size="sm"
                                  icon={PauseCircle}
                                  onClick={() => setSelectedSubForPause(sub)}
                                >
                                  Pause
                                </Button>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={PlayCircle}
                                  onClick={() => setSelectedSubForResume(sub)}
                                >
                                  Resume
                                </Button>
                              )}

                              <Link
                                to={`/subscriptions/${sub._id}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                title="Subscription Details"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={(p) => fetchSubscriptions(p)}
              />
            </>
          )}
        </div>
      )}

      {/* Pause Modal */}
      {selectedSubForPause && (
        <PauseModal
          isOpen={!!selectedSubForPause}
          onClose={() => setSelectedSubForPause(null)}
          subscription={selectedSubForPause}
          onSuccess={() => fetchSubscriptions(pagination.page)}
        />
      )}

      {/* Resume Modal */}
      {selectedSubForResume && (
        <ResumeModal
          isOpen={!!selectedSubForResume}
          onClose={() => setSelectedSubForResume(null)}
          subscription={selectedSubForResume}
          onSuccess={() => fetchSubscriptions(pagination.page)}
        />
      )}
    </div>
  );
};

export default SubscriptionsPage;
