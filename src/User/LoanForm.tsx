import React, { useState } from "react";
import { BadgeIndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

type ErrorsType = {
  amount?: string;
  purpose?: string;
  hasLoan?: string;
};

const LoanForm = () => {
  const navigate = useNavigate();

  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hasLoan, setHasLoan] = useState("");
  const [errors, setErrors] = useState<ErrorsType>({});
  const [loading, setLoading] = useState(false);

  // FORMAT
  const formatAmount = (value: string) => {
    if (!value) return "";
    return new Intl.NumberFormat("en-IN").format(Number(value));
  };

  const parseAmount = (value: string) => value.replace(/,/g, "");

  // VALIDATE
  const validate = () => {
    const newErrors: ErrorsType = {};
    const numericAmount = Number(parseAmount(amount));

    if (!amount) {
      newErrors.amount = "Loan amount is required";
    } else if (numericAmount < 1000) {
      newErrors.amount = "Minimum amount should be ₹1000";
    }

    if (!purpose) {
      newErrors.purpose = "Please select loan purpose";
    }

    if (!hasLoan) {
      newErrors.hasLoan = "Please select an option";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // SUBMIT
  const handleSubmit = async () => {
    if (loading) return;
    if (!validate()) return;

    setLoading(true);

    const data = {
      amount: Number(parseAmount(amount)),
      purpose,
      hasLoan,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/loan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const text = await res.text();

      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error("Server returned HTML instead of JSON");
      }

      if (!res.ok) {
        throw new Error(result.message || "Request failed");
      }

      // SUCCESS
      alert("Loan applied successfully!");
      navigate("/user/basic-details");

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">
      <Navbar />

      <div className="flex flex-1 items-center justify-center px-3 py-24 sm:px-4">
        <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white shadow-[0_18px_60px_rgba(32,56,85,0.10)]">

          <div className="border-b border-[#dfe7f2] px-6 py-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eaff]">
              <BadgeIndianRupee className="h-7 w-7 text-[#8048e2]" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#071d3a]">
              Apply for a Loan
            </h2>
            <p className="mt-2 text-sm font-medium text-[#52657d]">
              Share your loan requirement to continue.
            </p>
          </div>

          <div className="px-5 py-7 sm:px-7 sm:py-8">

          {/* Amount */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-[#071d3a]">
              How much money you want to borrow?
            </label>

            <div className="mt-2 flex h-[52px] items-center overflow-hidden rounded-lg border border-[#d8c5ff] focus-within:border-[#8048e2]">
              <span className="px-3 text-gray-400 border-r">₹</span>
              <input
                type="tel"
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const raw = parseAmount(e.target.value);
                  if (!/^\d*$/.test(raw)) return;
                  setAmount(formatAmount(raw));
                }}
                placeholder="Enter amount"
                className="min-w-0 flex-1 px-4 text-sm font-semibold text-[#071d3a] outline-none"
              />
            </div>

            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Purpose */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-[#071d3a]">
              Purpose of Loan?
            </label>

            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-2 h-[52px] w-full rounded-lg border border-[#d8c5ff] bg-white px-4 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]"
            >
              <option value="">Select Purpose</option>
              <option value="marriage">Marriage</option>
              <option value="education">Education</option>
              <option value="business">Business</option>
              <option value="medical">Medical</option>
            </select>

            {errors.purpose && (
              <p className="text-red-500 text-sm mt-1">{errors.purpose}</p>
            )}
          </div>

          {/* Loan */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-[#071d3a]">
              Do you have any running loan?
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className={`flex h-[45px] items-center justify-center gap-2 rounded-lg border text-sm font-bold transition ${hasLoan === "yes" ? "border-[#8048e2] bg-[#8048e2] text-white" : "border-[#d8c5ff] bg-white text-[#52657d]"}`}>
                <input
                  type="radio"
                  name="loan"
                  value="yes"
                  checked={hasLoan === "yes"}
                  onChange={(e) => setHasLoan(e.target.value)}
                />
                Yes
              </label>

              <label className={`flex h-[45px] items-center justify-center gap-2 rounded-lg border text-sm font-bold transition ${hasLoan === "no" ? "border-[#8048e2] bg-[#8048e2] text-white" : "border-[#d8c5ff] bg-white text-[#52657d]"}`}>
                <input
                  type="radio"
                  name="loan"
                  value="no"
                  checked={hasLoan === "no"}
                  onChange={(e) => setHasLoan(e.target.value)}
                />
                No
              </label>
            </div>

            {errors.hasLoan && (
              <p className="text-red-500 text-sm mt-1">{errors.hasLoan}</p>
            )}
          </div>

          {/* Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="h-[52px] w-full rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Continue"}
          </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LoanForm;
