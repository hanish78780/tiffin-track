import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import { subscriptionService } from "../../services/subscriptionService";
import { customerService } from "../../services/customerService";
import { useToast } from "../../context/ToastContext";
import { Calendar, ArrowRightLeft, AlertCircle, User, Phone, MapPin } from "lucide-react";

const TransferModal = ({ isOpen, onClose, subscription, onSuccess }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState("existing"); // "existing" or "new"

  // Existing customer mode state
  const [newCustomerId, setNewCustomerId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // New customer mode state
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  const [transferDate, setTransferDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setMode("existing");
      fetchCustomers();
      setTransferDate(today);
      setError("");
      setNewCustomerId("");
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const res = await customerService.getCustomers({ limit: 100 });
      // Filter out the current customer of this subscription
      const currentCustId = subscription?.customerId?._id || subscription?.customerId;
      const filtered = (res.customers || []).filter(
        (c) => String(c._id) !== String(currentCustId)
      );
      setCustomers(filtered);
    } catch {
      toast.error("Failed to load customer list for transfer.");
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setError("");

    if (!transferDate) {
      setError("Please choose the effective transfer date.");
      return;
    }

    let payload = { transferDate };

    if (mode === "existing") {
      if (!newCustomerId) {
        setError("Please select the customer to transfer the subscription to.");
        return;
      }
      payload.newCustomerId = newCustomerId;
    } else {
      if (!newCustomerName.trim() || !newCustomerPhone.trim() || !newCustomerAddress.trim()) {
        setError("Please fill out customer name, phone number, and delivery address.");
        return;
      }
      payload.newCustomer = {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        address: newCustomerAddress.trim()
      };
    }

    setLoading(true);

    try {
      await subscriptionService.transferSubscription(subscription._id, payload);
      toast.success(
        mode === "new"
          ? `Created customer "${newCustomerName.trim()}" and transferred subscription successfully!`
          : "Subscription transferred successfully! Future billing will now split accordingly."
      );
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to transfer subscription.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const customerOptions = [
    { value: "", label: loadingCustomers ? "Loading customers..." : "Select recipient customer..." },
    ...customers.map((c) => ({
      value: c._id,
      label: `${c.name} (${c.phone})`
    }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Subscription (T6)"
      subtitle="Transfer this plan to another customer mid-cycle. The plan and billing cycle carry over, and billing splits by who was served."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleTransfer}
            loading={loading}
            loadingText="Transferring..."
            icon={ArrowRightLeft}
          >
            Confirm Transfer
          </Button>
        </>
      }
    >
      <form onSubmit={handleTransfer} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="p-3 bg-blue-50/80 border border-blue-200/70 rounded-xl text-xs text-blue-900 space-y-1">
          <p className="font-semibold flex items-center gap-1.5 text-blue-950">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            Mid-Cycle Ownership Split:
          </p>
          <p>
            • The plan price (₹{subscription?.monthlyPrice?.toLocaleString()}) and cycle remain unchanged.
          </p>
          <p>
            • Days served before the transfer date remain billed to the previous customer.
          </p>
          <p>
            • Days served on and after the transfer date will be billed to the new customer.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Transfer To
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode("existing");
                setError("");
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === "existing"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Existing Customer
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setError("");
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === "new"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + Create New Customer
            </button>
          </div>
        </div>

        {/* Existing Customer Dropdown */}
        {mode === "existing" ? (
          <Select
            label="Select Existing Customer"
            required
            options={customerOptions}
            value={newCustomerId}
            onChange={(e) => setNewCustomerId(e.target.value)}
            disabled={loadingCustomers || loading}
            helperText="Choose a customer in your account without an active subscription."
          />
        ) : (
          /* New Customer Creation Form */
          <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              New Customer Information
            </h4>
            <Input
              label="Customer Name"
              type="text"
              required
              placeholder="e.g. Test Transfer Customer"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              prefixIcon={User}
            />
            <Input
              label="Phone Number"
              type="tel"
              required
              placeholder="e.g. 9876543222"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              prefixIcon={Phone}
              helperText="Must be unique to your account."
            />
            <Input
              label="Delivery Address"
              type="text"
              required
              placeholder="e.g. Jaipur"
              value={newCustomerAddress}
              onChange={(e) => setNewCustomerAddress(e.target.value)}
              prefixIcon={MapPin}
            />
          </div>
        )}

        <Input
          label="Effective Transfer Date"
          type="date"
          required
          value={transferDate}
          onChange={(e) => setTransferDate(e.target.value)}
          prefixIcon={Calendar}
          helperText="The date the new customer begins receiving lunch deliveries (inclusive)."
        />
      </form>
    </Modal>
  );
};

export default TransferModal;

