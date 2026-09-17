import React, { useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import { subscriptionService } from "../../services/subscriptionService";
import { useToast } from "../../context/ToastContext";
import { Calendar, PlayCircle } from "lucide-react";

const ResumeModal = ({ isOpen, onClose, subscription, currentPause, onSuccess }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [resumeDate, setResumeDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const handleResume = async (e) => {
    e.preventDefault();
    if (!resumeDate) {
      setError("Please select a resume date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await subscriptionService.resumeSubscription(subscription._id, {
        resumeDate
      });
      toast.success("Subscription resumed successfully.");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to resume subscription. Please try again.";
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
      title="Resume Subscription"
      subtitle="Mark this subscription as active and set the last day of the pause period."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleResume}
            loading={loading}
            loadingText="Resuming..."
            icon={PlayCircle}
          >
            Resume Subscription
          </Button>
        </>
      }
    >
      <form onSubmit={handleResume} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {currentPause && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
            <p className="font-semibold text-slate-900">Current Pause Details:</p>
            <p>
              <span className="text-slate-500">Paused Since:</span>{" "}
              <span className="font-medium">
                {new Date(currentPause.startDate).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </span>
            </p>
            {currentPause.reason && (
              <p>
                <span className="text-slate-500">Reason:</span>{" "}
                <span className="italic">{currentPause.reason}</span>
              </p>
            )}
          </div>
        )}

        <Input
          label="Resume Date / End of Pause"
          type="date"
          required
          value={resumeDate}
          onChange={(e) => setResumeDate(e.target.value)}
          prefixIcon={Calendar}
          helperText="Deliveries resume after this date. (Pause ends on this day inclusive)."
        />
      </form>
    </Modal>
  );
};

export default ResumeModal;
