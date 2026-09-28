"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function UploadInvoicePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("invoice", file);

      const res = await fetch("/api/invoices/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setParsedData(data.parsed);
      setInvoiceId(data.invoice_id);
      toast.success("Invoice parsed successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!invoiceId) return;
    setIsProcessing(true);
    toast("Agent is processing the invoice...", { icon: '🧠' });
    
    try {
      const res = await fetch("/api/invoices/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Processing failed");
      }

      toast.success(`Agent decision: ${data.decision.toUpperCase()}`);
      router.push(`/invoices/${invoiceId}`);
    } catch (err: any) {
      toast.error(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Upload Invoice</h1>
        <p className="text-[var(--text-secondary)] mt-1">Upload a PDF invoice for the AP Agent to process and review.</p>
      </div>

      {/* Step 1: Upload */}
      {!parsedData && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] border-dashed rounded-xl p-12 text-center">
          <UploadCloud className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Upload a PDF Invoice</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Max file size: 10MB</p>
          
          <input 
            type="file" 
            accept="application/pdf" 
            className="hidden" 
            id="file-upload" 
            onChange={handleFileChange}
          />
          <label 
            htmlFor="file-upload"
            className="bg-[var(--bg-elevated)] hover:bg-[var(--border)] text-white px-4 py-2 rounded-lg cursor-pointer transition-colors border border-[var(--border)]"
          >
            Select PDF File
          </label>

          {file && (
            <div className="mt-8 p-4 bg-[var(--bg-elevated)] rounded-lg flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[var(--accent-blue)]" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-[var(--accent-blue)] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Parse Invoice'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review & Process */}
      {parsedData && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="bg-[var(--bg-elevated)] px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[var(--accent-green)]" />
                Invoice Parsed Successfully
              </h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Extracted Vendor</label>
                <div className="font-medium mt-1">
                  {parsedData.vendor_name || 'Not detected'} 
                  {!parsedData.vendor_matched && parsedData.vendor_name && (
                    <span className="ml-2 text-xs text-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 px-2 py-0.5 rounded-full">
                      New Vendor
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Amount</label>
                <div className="font-medium font-mono mt-1 text-lg">
                  {parsedData.amount ? `₹${parsedData.amount.toLocaleString()}` : 'Not detected'}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">PO Number</label>
                <div className="font-medium font-mono mt-1 text-[var(--text-secondary)]">
                  {parsedData.po_number || 'Not provided'}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Invoice Number</label>
                <div className="font-medium font-mono mt-1 text-[var(--text-secondary)]">
                  {parsedData.invoice_number || 'Not provided'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button 
              onClick={() => { setParsedData(null); setFile(null); }}
              className="px-4 py-2 text-sm font-medium hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleProcess}
              disabled={isProcessing}
              className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-75 shadow-lg shadow-white/10"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Agent Thinking...
                </>
              ) : (
                <>
                  <span>🧠</span> Run AP Agent
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
