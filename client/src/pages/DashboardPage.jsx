import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  CalendarCheck,
  PauseCircle,
  ReceiptText,
  Plus,
  ArrowRight,
  ExternalLink,
  Phone
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { customerService } from "../services/customerService";
import { subscriptionService } from "../services/subscriptionService";
import KpiCard from "../components/common/KpiCard";
import Button from "../components/common/Button";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { TableSkeleton } from "../components/common/LoadingSkeleton";

const DashboardPage = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeSubscriptions: 0,
    pausedSubscriptions: 0,
    estimatedMonthlyRevenue: 0
  });

  const [recentCustomers, setRecentCustomers] = useState([]);
  const [customerSubscriptions, setCustomerSubscriptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch customers with limit=5 for the recent list and total count
      const custData = await customerService.getCustomers({
        page: 1,
        limit: 5,
        sort: "createdAt",
        order: "desc"
      });

      // 2. Fetch active subscriptions count
      const activeSubData = await subscriptionService.getSubscriptions({
        status: "active",
        limit: 100
      });

      // 3. Fetch paused subscriptions count
      const pausedSubData = await subscriptionService.getSubscriptions({
        status: "paused",
        limit: 100
      });

      const totalCustomersCount = custData.pagination?.total || 0;
      const activeCount = activeSubData.pagination?.total || 0;
      const pausedCount = pausedSubData.pagination?.total || 0;

      // Sum active subscription monthly prices for estimated monthly billing
      const activeSubsList = activeSubData.subscriptions || [];
      const pausedSubsList = pausedSubData.subscriptions || [];
      const totalEstimatedRev = activeSubsList.reduce(
        (sum, sub) => sum + (sub.monthlyPrice || 0),
        0
      );

      // Map customer subscriptions for quick status lookup
      const subMap = {};
      [...activeSubsList, ...pausedSubsList].forEach((sub) => {
        const custId = sub.customerId?._id || sub.customerId;
        if (custId) {
          subMap[custId] = sub;
        }
      });

      setStats({
        totalCustomers: totalCustomersCount,
        activeSubscriptions: activeCount,
        pausedSubscriptions: pausedCount,
        estimatedMonthlyRevenue: totalEstimatedRev
      });

      setRecentCustomers(custData.customers || []);
      setCustomerSubscriptions(subMap);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-800 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {getGreeting()}, {user?.name || "Tiffin Owner"} 👋
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/90 font-medium">
            Here's what's happening with your tiffin service today.
          </p>
        </div>

        {/* Quick actions in banner */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/customers/new">
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              className="bg-white text-emerald-900 hover:bg-emerald-50 border-none font-semibold"
            >
              Add Customer
            </Button>
          </Link>
          <Link to="/subscriptions/new">
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              Create Subscription
            </Button>
          </Link>
          <Link to="/billing">
            <Button
              variant="outline"
              size="sm"
              icon={ReceiptText}
              className="text-white border-white/30 hover:bg-white/10"
            >
              View Billing
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <ErrorState
          title="Could not load dashboard data"
          message={error}
          onRetry={fetchDashboardData}
        />
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard
          label="Total Customers"
          value={stats.totalCustomers}
          subtitle="Registered lunch recipients"
          icon={Users}
          iconBgColor="bg-emerald-50 text-emerald-700"
          loading={loading}
        />

        <KpiCard
          label="Active Subscriptions"
          value={stats.activeSubscriptions}
          subtitle="Currently receiving delivery"
          icon={CalendarCheck}
          iconBgColor="bg-teal-50 text-teal-700"
          loading={loading}
        />

        <KpiCard
          label="Paused Subscriptions"
          value={stats.pausedSubscriptions}
          subtitle="Excluded from weekday charges"
          icon={PauseCircle}
          iconBgColor="bg-amber-50 text-amber-700"
          loading={loading}
        />

        <KpiCard
          label="Active Plan Volume"
          value={`₹${stats.estimatedMonthlyRevenue.toLocaleString("en-IN")}`}
          subtitle="Full monthly price of active plans"
          icon={ReceiptText}
          iconBgColor="bg-blue-50 text-blue-700"
          loading={loading}
        />
      </div>

      {/* Recent Customers Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Customers</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Newly registered customer accounts and active subscription states
            </p>
          </div>
          <Link
            to="/customers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : recentCustomers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No customers yet"
              description="Add your first customer to start managing your tiffin service."
              actionLabel="+ Add Customer"
              onAction={() => (window.location.href = "/customers/new")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Subscription Plan</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCustomers.map((customer) => {
                  const sub = customerSubscriptions[customer._id];
                  return (
                    <tr
                      key={customer._id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{customer.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {sub ? (
                          <span className="font-medium text-slate-800">
                            {sub.planName} (₹{sub.monthlyPrice})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">
                            No subscription
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sub ? (
                          <StatusBadge status={sub.status} />
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/customers/${customer._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors px-2.5 py-1 rounded-lg hover:bg-emerald-50"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
