import React, { useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import { subscriptionService } from "../../services/subscriptionService";
import { useToast } from "../../context/ToastContext";
import { Calendar, PauseCircle } from "lucide-react";

const PauseModal = ({ isOpen, onClose, subscription, onSuccess }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const handlePause = async (e) => {
    e.preventDefault();
    if (!startDate) {
      setError("Please select a pause start date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await subscriptionService.pauseSubscription(subscription._id, {
        startDate,
        reason: reason.trim()
      });
      toast.success("Subscription paused successfully.");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to pause subscription. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pause Subscription"
      subtitle="Pause deliveries for this customer. Paused weekdays will not be charged."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="amber"
            size="sm"
            onClick={handlePause}
            loading={loading}
            loadingText="Pausing..."
            icon={PauseCircle}
          >
            Pause Subscription
          </Button>
        </>
      }
    >
      <form onSubmit={handlePause} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800">
          <p className="font-semibold mb-0.5">Note on Weekday Billing:</p>
          Deliveries are scheduled Mon–Fri. Both the start date and any subsequent pause dates are excluded from the customer's monthly bill.
        </div>

        <Input
          label="Pause Start Date"
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          prefixIcon={Calendar}
          helperText="The date from which deliveries are paused (inclusive)."
        />

        <Input
          label="Reason (Optional)"
          type="text"
          placeholder="e.g. Vacation, Festival, Out of town"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </form>
    </Modal>
  );
};

export default PauseModal;
