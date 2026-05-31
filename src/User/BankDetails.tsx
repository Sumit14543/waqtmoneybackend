import React, { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import { useNavigate } from "react-router-dom";
import UserProgress from "./UserProgress";

import { API_BASE_URL } from "@/config/api";
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const BankDetails = () => {
  const [form, setForm] = useState({
    ifsc: "",
    bankName: "",
    branchName: "",
    city: "",
    state: "",
    address: "",
    holderName: "",
    accountNumber: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const applicationId =
      sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId");

    if (!applicationId) return;

    sessionStorage.setItem("applicationId", applicationId);

    fetch(`${API_BASE_URL}/application/${applicationId}`)
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.message || "Failed to load bank details");
        }

        return result.data || {};
      })
      .then((data) => {
        setForm((current) => ({
          ...current,
          ifsc: data.ifsc_code || "",
          bankName: data.bank_name || "",
          branchName: data.branch_name || "",
          holderName: data.account_holder || "",
          accountNumber: data.account_number || "",
        }));
      })
      .catch((error) => {
        console.error("Bank details load error:", error);
      });
  }, []);

  useEffect(() => {
    if (form.ifsc.length !== 11) return;

    if (!IFSC_REGEX.test(form.ifsc)) {
      setErrors((current: any) => ({ ...current, ifsc: "Invalid IFSC format" }));
      return;
    }

    const controller = new AbortController();
    setIfscLoading(true);
    setErrors((current: any) => ({ ...current, ifsc: undefined, bankName: undefined }));

    fetch(`${API_BASE_URL}/application/ifsc/${form.ifsc}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.message || "IFSC not found");
        }

        return result.data || {};
      })
      .then((data) => {
        setForm((current) => ({
          ...current,
          bankName: data.bank || "",
          branchName: data.branch || "",
          city: data.city || "",
          state: data.state || "",
          address: data.address || "",
        }));
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        console.error("IFSC lookup error:", error);
        setErrors((current: any) => ({ ...current, ifsc: error.message || "IFSC not found" }));
        setForm((current) => ({
          ...current,
          bankName: "",
          branchName: "",
          city: "",
          state: "",
          address: "",
        }));
      })
      .finally(() => {
        setIfscLoading(false);
      });

    return () => controller.abort();
  }, [form.ifsc]);

  const handleChange = (e: any) => {
    const { name } = e.target;
    let { value } = e.target;

    // restrict account number to digits only
    if (name === "accountNumber") {
      value = value.replace(/\D/g, "");
    }

    // uppercase IFSC
    if (name === "ifsc") {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
    }

    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: undefined, submit: undefined });
  };

  const validate = () => {
    const newErrors: any = {};

    // Bank Name
    if (!form.bankName.trim()) {
      newErrors.bankName = "Bank name is required";
    }

    if (!form.branchName.trim()) {
      newErrors.branchName = "Branch name is required";
    }

    // Holder Name
    if (!form.holderName.trim()) {
      newErrors.holderName = "Holder name is required";
    } else if (!/^[A-Za-z\s]+$/.test(form.holderName)) {
      newErrors.holderName = "Only alphabets allowed";
    }

    // Account Number
    if (!form.accountNumber) {
      newErrors.accountNumber = "Account number required";
    } else if (!/^\d{9,18}$/.test(form.accountNumber)) {
      newErrors.accountNumber = "Enter 9–18 digit valid account number";
    }

    // IFSC
    if (!form.ifsc) {
      newErrors.ifsc = "IFSC required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc)) {
      newErrors.ifsc = "Invalid IFSC format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (loading || ifscLoading) return;

    if (!validate()) return;

    const applicationId =
      sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId");

    if (!applicationId) {
      setErrors({ submit: "Application session not found. Please start again." });
      return;
    }

    sessionStorage.setItem("applicationId", applicationId);
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_BASE_URL}/application/bank-details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: applicationId,
          ifsc: form.ifsc,
          bankName: form.bankName,
          branchName: form.branchName,
          holderName: form.holderName.trim(),
          accountNumber: form.accountNumber,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors({ submit: result.message || "Failed to save bank details" });
        return;
      }

      navigate(result.data?.nextPath || "/user/references");
    } catch (error) {
      console.error("Bank details save error:", error);
      setErrors({ submit: "Server not reachable" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "mt-2 h-[52px] w-full rounded-lg border border-[#d8c5ff] px-4 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]";

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">

      <Navbar />

      <div className="flex-1 px-4 pb-16 pt-24 md:pt-28">
        <UserProgress activeStep={5} />

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white shadow-[0_18px_60px_rgba(32,56,85,0.10)]"
        >
          <div className="border-b border-[#dfe7f2] px-6 py-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eaff]">
              <Landmark className="h-7 w-7 text-[#8048e2]" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-[#071d3a]">
              Bank Details
            </h1>
            <p className="mt-2 text-sm font-medium text-[#52657d]">
              Your Data is Completely Secure with us
            </p>
          </div>

          <div className="px-5 py-7 sm:px-7 sm:py-8">

            {errors.submit && (
              <p className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
                {errors.submit}
              </p>
            )}

            {/* IFSC */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">IFSC Code</label>
              <input
                name="ifsc"
                autoComplete="off"
                value={form.ifsc}
                onChange={handleChange}
                maxLength={11}
                className={inputClass}
                placeholder="e.g. SBIN0001234"
              />
              {ifscLoading && <p className="mt-1 text-xs text-[#8048e2]">Fetching bank details...</p>}
              {errors.ifsc && <p className="text-red-500 text-xs">{errors.ifsc}</p>}
            </div>

            {/* Bank Name */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Bank Name</label>
              <input
                name="bankName"
                autoComplete="organization"
                value={ifscLoading ? "Fetching..." : form.bankName}
                readOnly
                className={`${inputClass} bg-[#f8fafc]`}
              />
              {errors.bankName && <p className="text-red-500 text-xs">{errors.bankName}</p>}
            </div>

            {/* Branch Name */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Branch Name</label>
              <input
                name="branchName"
                autoComplete="address-level2"
                value={ifscLoading ? "Fetching..." : form.branchName}
                readOnly
                className={`${inputClass} bg-[#f8fafc]`}
              />
              {errors.branchName && <p className="text-red-500 text-xs">{errors.branchName}</p>}
            </div>

            {(form.city || form.state || form.address) && (
              <div className="mb-4 rounded-lg border border-[#d8c5ff] bg-[#f8fafc] px-4 py-3 text-left text-xs font-semibold leading-5 text-[#52657d]">
                {(form.city || form.state) && <p>{[form.city, form.state].filter(Boolean).join(", ")}</p>}
                {form.address && <p className="mt-1">{form.address}</p>}
              </div>
            )}

            {/* Holder Name */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Account Holder Name</label>
              <input name="holderName" autoComplete="name" value={form.holderName} onChange={handleChange} className={inputClass} />
              {errors.holderName && <p className="text-red-500 text-xs">{errors.holderName}</p>}
            </div>

            {/* Account Number */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Account Number</label>
              <input
                name="accountNumber"
                autoComplete="off"
                value={form.accountNumber}
                onChange={handleChange}
                maxLength={18}
                className={inputClass}
                type="text"
                placeholder="Only digits"
              />
              {errors.accountNumber && <p className="text-red-500 text-xs">{errors.accountNumber}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || ifscLoading}
              className="mt-3 h-[52px] w-full rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90"
            >
              {loading ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>

      <Footer />

    </div>
  );
};

export default BankDetails;
