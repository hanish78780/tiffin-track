import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Receipt,
  PlusCircle,
  Edit2,
  PauseCircle,
  PlayCircle,
  Clock
} from "lucide-react";
import { customerService } from "../services/customerService";
import { subscriptionService } from "../services/subscriptionService";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import StatusBadge from "../components/common/StatusBadge";
import ErrorState from "../components/common/ErrorState";
import { CardSkeleton } from "../components/common/LoadingSkeleton";
import PauseModal from "../components/subscriptions/PauseModal";
import ResumeModal from "../components/subscriptions/ResumeModal";

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  const fetchCustomerAndSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch customer details
      const custData = await customerService.getCustomerById(id);
      setCustomer(custData.customer);

      // 2. Fetch subscription for this customer using backend customerId filter
      const subData = await subscriptionService.getSubscriptions({
        customerId: id,
        limit: 1
      });

      const foundSub =
        subData.subscriptions && subData.subscriptions.length > 0
          ? subData.subscriptions[0]
          : null;

      setSubscription(foundSub || null);
    } catch (err) {
      console.error("Failed to fetch customer details:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Customer not found or unable to load details."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomerAndSubscription();
  }, [fetchCustomerAndSubscription]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
        <ErrorState
          title="Customer Not Found"
          message={error || "The requested customer profile could not be loaded."}
          onRetry={fetchCustomerAndSubscription}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to={`/customers/${customer._id}/edit`}>
            <Button variant="outline" size="sm" icon={Edit2}>
              Edit Customer
            </Button>
          </Link>
          {subscription && (
            <Link to={`/billing?customerId=${customer._id}`}>
              <Button variant="primary" size="sm" icon={Receipt}>
                View Bill
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Customer Profile Card */}
      <Card
        title={customer.name}
        subtitle="Customer contact & delivery details"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">ID: {customer._id}</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
            <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Phone Number
              </span>
              <p className="font-semibold text-slate-900 mt-0.5 font-mono">{customer.phone}</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
            <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Customer Since
              </span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </p>
            </div>
          </div>

          <div className="sm:col-span-2 p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Delivery Address
              </span>
              <p className="text-slate-800 mt-0.5 leading-relaxed">{customer.address}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Subscription Card */}
      {subscription ? (
        <Card
          title="Subscription Details"
          subtitle="Monthly plan and delivery status"
          action={<StatusBadge status={subscription.status} />}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Plan Name
                </span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {subscription.planName}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Monthly Price
                </span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
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
            </div>

            {/* Action buttons based on status */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {subscription.status === "active" ? (
                  <span>Deliveries scheduled for upcoming weekdays.</span>
                ) : (
                  <span className="text-amber-700 font-medium">
                    Deliveries paused. No weekday charges will accumulate.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {subscription.status === "active" ? (
                  <Button
                    variant="amber"
                    size="sm"
                    icon={PauseCircle}
                    onClick={() => setPauseModalOpen(true)}
                  >
                    Pause Subscription
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={PlayCircle}
                    onClick={() => setResumeModalOpen(true)}
                  >
                    Resume Subscription
                  </Button>
                )}

                <Link to={`/subscriptions/${subscription._id}`}>
                  <Button variant="outline" size="sm">
                    View Subscription Log
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Subscription Details">
          <div className="text-center py-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">No subscription found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                This customer does not have an active monthly lunch plan yet.
              </p>
            </div>
            <div className="pt-2">
              <Link to={`/subscriptions/new?customerId=${customer._id}`}>
                <Button variant="primary" size="sm" icon={PlusCircle}>
                  Create Subscription
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Pause & Resume Modals */}
      {subscription && (
        <>
          <PauseModal
            isOpen={pauseModalOpen}
            onClose={() => setPauseModalOpen(false)}
            subscription={subscription}
            onSuccess={fetchCustomerAndSubscription}
          />
          <ResumeModal
            isOpen={resumeModalOpen}
            onClose={() => setResumeModalOpen(false)}
            subscription={subscription}
            onSuccess={fetchCustomerAndSubscription}
          />
        </>
      )}
    </div>
  );
};

export default CustomerDetailPage;
