import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Phone, MapPin, ArrowLeft, PlusCircle, CheckCircle2 } from "lucide-react";
import { customerService } from "../services/customerService";
import { useToast } from "../context/ToastContext";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

const CustomerNewPage = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCustomer, setCreatedCustomer] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Please fill in name, phone, and address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await customerService.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim()
      });

      toast.success("Customer added successfully.");
      setCreatedCustomer(data.customer);
    } catch (err) {
      let msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to add customer. Please try again.";
      if (err.response?.status === 409 || msg.includes("Duplicate") || msg.includes("phone")) {
        msg = "This phone number is already registered to another customer in your account.";
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
      </div>

      {/* Success Next Step Banner */}
      {createdCustomer ? (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Customer Created Successfully!
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                <span className="font-semibold text-slate-900">{createdCustomer.name}</span>{" "}
                has been registered. Would you like to set up their lunch subscription plan now?
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link to={`/subscriptions/new?customerId=${createdCustomer._id}`}>
                <Button variant="primary" size="md" icon={PlusCircle}>
                  Create Subscription for {createdCustomer.name}
                </Button>
              </Link>
              <Link to={`/customers/${createdCustomer._id}`}>
                <Button variant="outline" size="md">
                  View Customer Profile
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setCreatedCustomer(null);
                  setName("");
                  setPhone("");
                  setAddress("");
                }}
              >
                Add Another Customer
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card
          title="Add New Customer"
          subtitle="Register a new tiffin customer with their contact and delivery address."
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
              placeholder="e.g. Rahul Sharma"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              prefixIcon={User}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="e.g. 9876543210"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              prefixIcon={Phone}
              helperText="Unique per owner. Used for fast customer lookup."
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Delivery Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  required
                  placeholder="Flat/House number, Street, Landmark, Area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <Link to="/customers">
                <Button variant="outline" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                loadingText="Creating Customer..."
              >
                Create Customer
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default CustomerNewPage;
