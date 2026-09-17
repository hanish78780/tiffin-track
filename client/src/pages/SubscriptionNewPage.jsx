import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, DollarSign, Utensils, UserCheck, AlertCircle } from "lucide-react";
import { subscriptionService } from "../services/subscriptionService";
import { customerService } from "../services/customerService";
import { useToast } from "../context/ToastContext";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";

const SubscriptionNewPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") || "";

  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(preselectedCustomerId);
  const [planName, setPlanName] = useState("Monthly Lunch Plan");
  const [monthlyPrice, setMonthlyPrice] = useState("3000");

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);

  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(true);
  const [error, setError] = useState("");

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadCustomers = async () => {
      setFetchingCustomers(true);
      try {
        const data = await customerService.getCustomers({ limit: 100 });
        setCustomers(data.customers || []);
        if (preselectedCustomerId) {
          setCustomerId(preselectedCustomerId);
        }
      } catch (err) {
        console.error("Failed to load customers for selection:", err);
      } finally {
        setFetchingCustomers(false);
      }
    };
    loadCustomers();
  }, [preselectedCustomerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    const priceNum = parseFloat(monthlyPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid positive monthly price.");
      return;
    }

    if (!startDate) {
      setError("Please select a subscription start date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await subscriptionService.createSubscription({
        customerId,
        planName: planName.trim(),
        monthlyPrice: priceNum,
        startDate
      });

      toast.success("Subscription created successfully!");
      navigate(`/customers/${customerId}`);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to create subscription. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Link
          to="/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subscriptions</span>
        </Link>
      </div>

      <Card
        title="Create Subscription"
        subtitle="Set up a monthly lunch delivery plan for a registered customer."
      >
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Select Customer"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={fetchingCustomers}
            placeholder={fetchingCustomers ? "Loading customers..." : "Choose a customer"}
            options={customers.map((c) => ({
              value: c._id,
              label: `${c.name} (${c.phone})`
            }))}
            helperText={
              customers.length === 0 && !fetchingCustomers
                ? "No customers found. Please add a customer first."
                : "Deliveries and bills will be linked to this customer."
            }
          />

          <Input
            label="Plan Name"
            type="text"
            required
            placeholder="e.g. Monthly Lunch Plan"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            prefixIcon={Utensils}
          />

          <Input
            label="Monthly Price (₹)"
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="e.g. 3000"
            value={monthlyPrice}
            onChange={(e) => setMonthlyPrice(e.target.value)}
            prefixIcon={DollarSign}
            helperText="The base monthly plan fee. Weekday deliveries will be pro-rated against this price."
          />

          <Input
            label="Start Date"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            prefixIcon={Calendar}
            helperText="Date from which regular weekday deliveries begin."
          />

          <div className="pt-3 flex items-center justify-end gap-3">
            <Link to="/subscriptions">
              <Button variant="outline" size="md">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              loadingText="Creating Plan..."
            >
              Create Subscription
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SubscriptionNewPage;
