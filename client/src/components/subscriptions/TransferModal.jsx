import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import { subscriptionService } from "../../services/subscriptionService";
import { customerService } from "../../services/customerService";
import { useToast } from "../../context/ToastContext";
import { Calendar, ArrowRightLeft, AlertCircle } from "lucide-react";

const TransferModal = ({ isOpen, onClose, subscription, onSuccess }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [transferDate, setTransferDate] = useState(today);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      setTransferDate(today);
      setError("");
      setNewCustomerId("");
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
    if (!newCustomerId) {
      setError("Please select the new customer to transfer the subscription to.");
      return;
    }

    if (!transferDate) {
      setError("Please choose the effective transfer date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await subscriptionService.transferSubscription(subscription._id, {
        newCustomerId,
        transferDate
      });
      toast.success("Subscription transferred successfully! Future billing will now split accordingly.");
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

        <Select
          label="Transfer to Customer"
          required
          options={customerOptions}
          value={newCustomerId}
          onChange={(e) => setNewCustomerId(e.target.value)}
          disabled={loadingCustomers || loading}
          helperText="Select a registered customer in your account without an active subscription."
        />

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
