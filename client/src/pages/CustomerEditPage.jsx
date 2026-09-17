import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, MapPin } from "lucide-react";
import { customerService } from "../services/customerService";
import { useToast } from "../context/ToastContext";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ErrorState from "../components/common/ErrorState";
import { CardSkeleton } from "../components/common/LoadingSkeleton";

const CustomerEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await customerService.getCustomerById(id);
        const c = data.customer;
        setName(c.name || "");
        setPhone(c.phone || "");
        setAddress(c.address || "");
      } catch (err) {
        setError(
          err.response?.data?.message ||
          err.message ||
          "Customer not found or unable to load."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Name, phone, and address are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await customerService.updateCustomer(id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim()
      });

      toast.success("Customer updated successfully.");
      navigate(`/customers/${id}`);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to update customer. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <CardSkeleton lines={4} />
      </div>
    );
  }

  if (error && !name) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Link
          to={`/customers/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customer Profile</span>
        </Link>
      </div>

      <Card
        title="Edit Customer"
        subtitle="Update contact and delivery details for this customer."
      >
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            prefixIcon={User}
          />

          <Input
            label="Phone Number"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            prefixIcon={Phone}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Delivery Address <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <Link to={`/customers/${id}`}>
              <Button variant="outline" size="md">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
              loadingText="Saving Changes..."
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CustomerEditPage;
