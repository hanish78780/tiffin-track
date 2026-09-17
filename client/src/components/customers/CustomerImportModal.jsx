import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { customerService } from "../../services/customerService";
import { useToast } from "../../context/ToastContext";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Copy,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";

const SAMPLE_CSV = `name,phone,address,planName,monthlyPrice,startDate
Rahul Sharma,9876543210,Jaipur,Monthly Lunch,3000,01/09/2026
Rahul Sharma,9876543210,Jaipur,Monthly Lunch,3000,2026-09-01
Priya Verma,9876543211,Jaipur,Monthly Lunch,3000,9-1-2026
,9876543212,Jaipur,Monthly Lunch,3000,2026-09-01
Amit, ,Jaipur,Monthly Lunch,3000,2026-09-01`;

const CustomerImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const toast = useToast();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCsvText(evt.target?.result || "");
      setReport(null);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setCsvText(SAMPLE_CSV);
    setFileName("sample_messy_customers.csv");
    setReport(null);
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast.error("Please provide or upload a CSV file first.");
      return;
    }

    setLoading(true);

    try {
      const res = await customerService.importCustomers(csvText);
      setReport(res);
      toast.success(
        `Import complete: ${res.imported} imported, ${res.deduped} deduped, ${res.rejected} rejected.`
      );
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to import customer CSV.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleReset = () => {
    setCsvText("");
    setFileName("");
    setReport(null);
    setExpandedSection(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Customers & Subscriptions (T4)"
      subtitle="Upload a messy CSV customer list. The system normalizes phones, parses mixed dates, deduplicates, and creates subscriptions."
      maxWidth="max-w-2xl"
      footer={
        <>
          {report ? (
            <>
              <Button variant="outline" size="sm" onClick={handleReset} icon={RefreshCw}>
                Import Another File
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImport}
                loading={loading}
                loadingText="Importing & Deduplicating..."
                icon={UploadCloud}
                disabled={!csvText.trim()}
              >
                Validate & Import
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* If no report yet, show upload & preview inputs */}
        {!report ? (
          <>
            {/* File Dropzone / Picker */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                id="csv-file-input"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="csv-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-emerald-700">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 hover:text-emerald-700">
                    Click to browse CSV file
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supports commas, quotes, mixed dates, and messy phone formats
                  </p>
                </div>
              </label>

              {fileName && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-800">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>

            {/* Paste or Load Sample */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                CSV Content Preview
              </span>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 underline underline-offset-2"
              >
                Load Sample Messy Dataset
              </button>
            </div>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setFileName("pasted_content.csv");
              }}
              placeholder="name,phone,address,planName,monthlyPrice,startDate&#10;Rahul Sharma,9876543210,Jaipur,Monthly Lunch,3000,2026-09-01..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
          </>
        ) : (
          /* Report Screen */
          <div className="space-y-4 animate-fade-in">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Imported</span>
                </div>
                <p className="text-2xl font-extrabold text-emerald-950 font-mono">
                  {report.imported}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 text-center">
                <div className="flex items-center justify-center gap-1.5 text-amber-700 mb-1">
                  <Copy className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Deduped</span>
                </div>
                <p className="text-2xl font-extrabold text-amber-950 font-mono">
                  {report.deduped}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/60 text-center">
                <div className="flex items-center justify-center gap-1.5 text-red-700 mb-1">
                  <AlertOctagon className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Rejected</span>
                </div>
                <p className="text-2xl font-extrabold text-red-950 font-mono">
                  {report.rejected}
                </p>
              </div>
            </div>

            {/* Collapsible Details Sections */}
            <div className="space-y-2 text-xs">
              {/* Imported items */}
              {report.details?.imported?.length > 0 && (
                <div className="rounded-xl border border-emerald-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("imported")}
                    className="w-full px-4 py-2.5 bg-emerald-50/70 hover:bg-emerald-100/70 font-semibold text-emerald-900 flex items-center justify-between text-left transition-colors"
                  >
                    <span>Successfully Imported Rows ({report.details.imported.length})</span>
                    {expandedSection === "imported" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSection === "imported" && (
                    <div className="p-3 bg-white space-y-1.5 max-h-48 overflow-y-auto">
                      {report.details.imported.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-700 last:border-none">
                          <span>Row {item.row}: <strong className="text-slate-900">{item.customerName}</strong> ({item.phone})</span>
                          <span className="text-[11px] text-emerald-700 font-medium">{item.planName} • ₹{item.monthlyPrice}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Deduped items */}
              {report.details?.deduped?.length > 0 && (
                <div className="rounded-xl border border-amber-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("deduped")}
                    className="w-full px-4 py-2.5 bg-amber-50/70 hover:bg-amber-100/70 font-semibold text-amber-900 flex items-center justify-between text-left transition-colors"
                  >
                    <span>Deduplicated Rows ({report.details.deduped.length})</span>
                    {expandedSection === "deduped" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSection === "deduped" && (
                    <div className="p-3 bg-white space-y-1.5 max-h-48 overflow-y-auto">
                      {report.details.deduped.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-700 last:border-none">
                          <span>Row {item.row}: <strong>{item.phone}</strong> {item.name && `(${item.name})`}</span>
                          <span className="text-[11px] text-amber-700">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Rejected items */}
              {report.details?.rejected?.length > 0 && (
                <div className="rounded-xl border border-red-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("rejected")}
                    className="w-full px-4 py-2.5 bg-red-50/70 hover:bg-red-100/70 font-semibold text-red-900 flex items-center justify-between text-left transition-colors"
                  >
                    <span>Rejected Rows ({report.details.rejected.length})</span>
                    {expandedSection === "rejected" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSection === "rejected" && (
                    <div className="p-3 bg-white space-y-1.5 max-h-48 overflow-y-auto">
                      {report.details.rejected.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-700 last:border-none">
                          <span>Row {item.row}: {item.name || item.phone || "Unknown Entry"}</span>
                          <span className="text-[11px] text-red-700 font-medium">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CustomerImportModal;
