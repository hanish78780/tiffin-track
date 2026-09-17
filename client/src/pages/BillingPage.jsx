import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ReceiptText,
  Calculator,
  User,
  Calendar,
  AlertCircle,
  PlusCircle,
  HelpCircle
} from "lucide-react";
import { customerService } from "../services/customerService";
import { billingService } from "../services/billingService";
import Select from "../components/common/Select";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import BillingCard from "../components/billing/BillingCard";
import BillingBreakdown from "../components/billing/BillingBreakdown";
import { BillingSkeleton } from "../components/common/LoadingSkeleton";
import EmptyState from "../components/common/EmptyState";

const BillingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCustomerId = searchParams.get("customerId") || "";
  const initialMonth = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [month, setMonth] = useState(initialMonth); // YYYY-MM

  const [billResult, setBillResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(true);
  const [error, setError] = useState(null);
  const [isNoSubscription, setIsNoSubscription] = useState(false);

  // Load customer list for dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      setFetchingCustomers(true);
      try {
        const data = await customerService.getCustomers({ limit: 100 });
        setCustomers(data.customers || []);
      } catch (err) {
        console.error("Failed to load customers for billing:", err);
      } finally {
        setFetchingCustomers(false);
      }
    };
    loadCustomers();
  }, []);

  const calculateBill = useCallback(async (custId, targetMonth) => {
    if (!custId) {
      setError("Please select a customer.");
      setBillResult(null);
      return;
    }

    if (!targetMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth)) {
      setError("Please select a valid month in YYYY-MM format.");
      setBillResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setIsNoSubscription(false);
    setBillResult(null);

    // Sync URL params
    setSearchParams({ customerId: custId, month: targetMonth });

    try {
      const data = await billingService.getBill(custId, targetMonth);
      setBillResult(data);
    } catch (err) {
      console.error("Billing calculation error:", err);
      const msg = err.response?.data?.message || err.message || "Unable to calculate bill.";
      setError(msg);

      if (
        msg.toLowerCase().includes("no subscription found") ||
        err.response?.status === 404
      ) {
        setIsNoSubscription(true);
      }
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  // Auto-calculate on initial mount if customerId is in URL
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
      calculateBill(initialCustomerId, initialMonth);
    }
  }, [initialCustomerId, initialMonth, calculateBill]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    calculateBill(selectedCustomerId, month);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Monthly Billing
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Calculate fair bills based on actual weekdays served. Paused weekdays are subtracted.
        </p>
      </div>

      {/* Control Card: Customer & Month Pickers */}
      <Card>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Customer"
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              disabled={fetchingCustomers}
              placeholder={fetchingCustomers ? "Loading customers..." : "Select customer to bill"}
              options={customers.map((c) => ({
                value: c._id,
                label: `${c.name} (${c.phone})`
              }))}
            />

            <Input
              label="Billing Month"
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              prefixIcon={Calendar}
              helperText="Deliveries occur Monday through Friday only."
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Weekends are excluded. Pauses spanning weekends do not penalize customers.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              loadingText="Calculating..."
              icon={Calculator}
            >
              Calculate Bill
            </Button>
          </div>
        </form>
      </Card>

      {/* Loading Skeleton */}
      {loading && <BillingSkeleton />}

      {/* Error / No Subscription State */}
      {!loading && error && (
        <div className="max-w-2xl mx-auto">
          {isNoSubscription ? (
            <Card className="border-amber-200 bg-amber-50/40">
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    No Subscription Found
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    This customer does not have an active subscription for billing. Please create a monthly plan first.
                  </p>
                </div>
                {selectedCustomerId && (
                  <div className="pt-2">
                    <Link to={`/subscriptions/new?customerId=${selectedCustomerId}`}>
                      <Button variant="primary" size="sm" icon={PlusCircle}>
                        Create Subscription
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-700 font-medium">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Calculation Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Billing Result Display */}
      {!loading && billResult && (
        <div className="space-y-4">
          <BillingCard
            billData={billResult}
            customerId={selectedCustomerId}
          />
          <BillingBreakdown billing={billResult.billing} />
        </div>
      )}

      {/* Empty State before any calculation */}
      {!loading && !billResult && !error && (
        <div className="max-w-2xl mx-auto">
          <EmptyState
            icon={ReceiptText}
            title="Select a customer to view their monthly bill"
            description="Choose any registered customer and select a calendar month to calculate the pro-rated bill according to actual weekdays served."
          />
        </div>
      )}
    </div>
  );
};

export default BillingPage;
