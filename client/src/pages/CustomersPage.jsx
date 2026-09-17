import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Plus,
  ArrowUpDown,
  Phone,
  MapPin,
  ExternalLink,
  Edit2,
  UploadCloud,
  Trash2
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { customerService } from "../services/customerService";
import { subscriptionService } from "../services/subscriptionService";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import SearchBar from "../components/common/SearchBar";
import Pagination from "../components/common/Pagination";
import Button from "../components/common/Button";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { TableSkeleton } from "../components/common/LoadingSkeleton";
import CustomerImportModal from "../components/customers/CustomerImportModal";


const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [importModalOpen, setImportModalOpen] = useState(false);

  // Delete customer modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const toast = useToast();

  // Dedicated phone lookup state (GET /api/customers/phone/:phone)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState(null);


  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const data = await customerService.getCustomers({
        search: debouncedSearch.trim() || undefined,
        page,
        limit: pagination.limit,
        sort,
        order
      });

      setCustomers(data.customers || []);
      setPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 1 });

      // Fetch active subscriptions to show badges
      const subData = await subscriptionService.getSubscriptions({ limit: 100 });
      const subMap = {};
      (subData.subscriptions || []).forEach((sub) => {
        const custId = sub.customerId?._id || sub.customerId;
        if (custId) {
          subMap[custId] = sub;
        }
      });
      setSubscriptions(subMap);
    } catch (err) {
      console.error("Failed to load customers:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to load customers. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pagination.limit, sort, order]);

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  const handleSort = (field) => {
    if (sort === field) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setOrder("asc");
    }
  };

  const handlePhoneLookup = async (e) => {
    e.preventDefault();
    if (!lookupPhone.trim()) {
      setLookupError("Please enter a phone number.");
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const data = await customerService.getCustomerByPhone(lookupPhone.trim());
      setLookupResult(data.customer);
    } catch (err) {
      setLookupError(
        err.response?.data?.message || "No customer found with this phone number."
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await customerService.deleteCustomer(customerToDelete._id);
      toast.success(`Customer "${customerToDelete.name}" deleted successfully.`);
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
      fetchCustomers(pagination.page);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to delete customer.";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (

    <div className="space-y-6 animate-fade-in">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your tiffin customers and subscriptions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            icon={UploadCloud}
            onClick={() => setImportModalOpen(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={Phone}
            onClick={() => {
              setPhoneModalOpen(true);
              setLookupPhone("");
              setLookupResult(null);
              setLookupError(null);
            }}
          >
            Lookup by Phone
          </Button>
          <Link to="/customers/new">
            <Button variant="primary" size="md" icon={Plus}>
              Add Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
            placeholder="Search by name or phone..."
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Sort:
          </span>
          <select
            value={`${sort}_${order}`}
            onChange={(e) => {
              const [newSort, newOrder] = e.target.value.split("_");
              setSort(newSort);
              setOrder(newOrder);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <ErrorState
          title="Could not load customers"
          message={error}
          onRetry={() => fetchCustomers(pagination.page)}
        />
      )}

      {/* Main Customers Table Card */}
      {!error && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : customers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title={search ? "No matching customers" : "No customers yet"}
                description={
                  search
                    ? `No customers found matching "${search}". Try searching by phone number or another keyword.`
                    : "Add your first customer to start managing your tiffin service."
                }
                actionLabel={search ? "Clear Search" : "+ Add Customer"}
                onAction={
                  search
                    ? () => setSearch("")
                    : () => (window.location.href = "/customers/new")
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th
                        className="px-6 py-3.5 cursor-pointer hover:text-slate-800 transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Customer</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="px-6 py-3.5">Phone</th>
                      <th className="px-6 py-3.5">Delivery Address</th>
                      <th className="px-6 py-3.5">Subscription</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((cust) => {
                      const sub = subscriptions[cust._id];
                      return (
                        <tr
                          key={cust._id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            <Link
                              to={`/customers/${cust._id}`}
                              className="hover:text-emerald-700 transition-colors"
                            >
                              {cust.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="font-mono text-xs">{cust.phone}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{cust.address}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {sub ? (
                              <span className="text-xs font-semibold text-slate-800">
                                {sub.planName}
                                <span className="text-slate-500 font-normal ml-1">
                                  (₹{sub.monthlyPrice})
                                </span>
                              </span>
                            ) : (
                              <Link
                                to={`/subscriptions/new?customerId=${cust._id}`}
                                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Plan</span>
                              </Link>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {sub ? (
                              <StatusBadge status={sub.status} />
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/customers/${cust._id}/edit`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                title="Edit Customer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerToDelete(cust);
                                  setDeleteError(null);
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete Customer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <Link
                                to={`/customers/${cust._id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition-colors border border-slate-200"
                              >
                                <span>Details</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Backend Pagination Bar */}
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={(newPage) => fetchCustomers(newPage)}
              />
            </>
          )}
        </div>
      )}

      {/* Dedicated Phone Lookup Modal (calls GET /api/customers/phone/:phone) */}
      <Modal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        title="Lookup Customer by Phone"
        subtitle="Search customer records directly by exact phone number."
        footer={
          <Button variant="outline" size="sm" onClick={() => setPhoneModalOpen(false)}>
            Close
          </Button>
        }
      >
        <form onSubmit={handlePhoneLookup} className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Phone Number"
                type="tel"
                placeholder="e.g. 9876543210"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                prefixIcon={Phone}
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={lookupLoading}
              loadingText="Searching..."
            >
              Look Up
            </Button>
          </div>

          {lookupError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{lookupResult.name}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{lookupResult.phone}</p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                  Found
                </span>
              </div>

              <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-emerald-100">
                <span className="font-semibold text-slate-700">Address:</span> {lookupResult.address}
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-emerald-100">
                <Link to={`/billing?customerId=${lookupResult._id}`}>
                  <Button variant="outline" size="sm">
                    Calculate Bill
                  </Button>
                </Link>
                <Link to={`/customers/${lookupResult._id}`}>
                  <Button variant="primary" size="sm">
                    View Full Profile
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* T4: Customer Import Modal */}
      <CustomerImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => fetchCustomers(1)}
      />

      {/* Delete Customer Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteModalOpen(false);
            setCustomerToDelete(null);
          }
        }}
        title="Delete Customer"
        subtitle={customerToDelete ? `Are you sure you want to delete ${customerToDelete.name}?` : "Delete Customer"}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteModalOpen(false);
                setCustomerToDelete(null);
              }}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteCustomer}
              loading={deleteLoading}
              loadingText="Deleting..."
              icon={Trash2}
            >
              Delete Customer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
              {deleteError}
            </div>
          )}
          <p className="text-xs text-slate-600 leading-relaxed">
            This action will permanently delete{" "}
            <span className="font-semibold text-slate-900">{customerToDelete?.name}</span>{" "}
            ({customerToDelete?.phone}).
          </p>
          <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-semibold">Important:</p>
            <p>Customers with an active subscription cannot be deleted. You must end or cancel their subscription first.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage;

