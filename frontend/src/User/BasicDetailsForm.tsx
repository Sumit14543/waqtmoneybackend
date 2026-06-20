import React, { useState, useEffect } from "react";
import { ArrowRight, BadgeCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import UserProgress from "./UserProgress";

import { API_BASE_URL, getApiHeaders } from "@/config/api";

type BasicErrors = {
  pincode?: string;
  city?: string;
  income?: string;
  incomeType?: string;
  submit?: string;
};

const MIN_MONTHLY_INCOME = 20000;

const BasicDetailsForm = () => {
  const navigate = useNavigate();

  const [employment, setEmployment] = useState("salaried");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [income, setIncome] = useState("20,000");
  const [incomeType, setIncomeType] = useState("Account");
  const [errors, setErrors] = useState<BasicErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchingCity, setFetchingCity] = useState(false);

  useEffect(() => {
    if (pincode.length === 6) {
      setFetchingCity(true);
      fetch(`${API_BASE_URL}/pan/pincode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pincode }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.message || `API returned ${res.status}`);
          }
          return data;
        })
        .then((data) => {
          if (data.success && data.city) {
            setCity(data.city);
            setErrors((prev) => ({ ...prev, pincode: undefined, city: undefined }));
          } else {
            setErrors((prev) => ({ ...prev, pincode: "Invalid pincode" }));
            setCity("");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch city:", err);
          setErrors((prev) => ({ ...prev, pincode: err.message || "Failed to fetch city." }));
          setCity("");
        })
        .finally(() => {
          setFetchingCity(false);
        });
    }
  }, [pincode]);

  const digitsOnly = (value: string) => value.replace(/\D/g, "");

  const formatAmount = (value: string) => {
    const raw = digitsOnly(value);
    if (!raw) return "";
    return new Intl.NumberFormat("en-IN").format(Number(raw));
  };

  const parseAmount = (value: string) => value.replace(/,/g, "");

  const validate = () => {
    const nextErrors: BasicErrors = {};

    if (!pincode) {
      nextErrors.pincode = "Pin code is required";
    } else if (pincode.length !== 6) {
      nextErrors.pincode = "Pin code must be 6 digits";
    }

    if (!city.trim()) {
      nextErrors.city = "City is required";
    }

    if (!income) {
      nextErrors.income = "Monthly income is required";
    } else if (Number(parseAmount(income)) < MIN_MONTHLY_INCOME) {
      nextErrors.income = "Salary less than Rs 20,000 is not accepted";
    }

    if (!incomeType) {
      nextErrors.incomeType = "Select income type";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
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
      const response = await fetch(`${API_BASE_URL}/application/update`, {
        method: "PUT",
        credentials: "include",
        headers: getApiHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: applicationId,
          employment,
          salary: Number(parseAmount(income)),
          income_received_in: incomeType.toLowerCase(),
          pincode,
          city: city.trim(),
          current_step: "basic_details",
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors({ submit: result.message || "Failed to save basic details" });
        return;
      }

      navigate("/user/pan-verification");
    } catch (error) {
      console.error("Basic details save error:", error);
      setErrors({ submit: "Server not reachable" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">
      <Navbar />

      <div className="flex-1 px-4 pb-16 pt-24 md:pt-28">
        <UserProgress activeStep={1} />

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-[480px] overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white shadow-[0_18px_60px_rgba(32,56,85,0.10)]"
        >
          <div className="border-b border-[#dfe7f2] px-6 py-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eaff]">
              <BadgeCheck className="h-7 w-7 text-[#8048e2]" />
            </div>

            <h2 className="mt-4 text-xl font-bold text-[#071d3a]">
              Basic Details
            </h2>

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

            <div className="space-y-5">
              <div>
                <label className="text-sm font-bold text-[#071d3a]">Pin Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  value={pincode}
                  onChange={(event) => setPincode(digitsOnly(event.target.value).slice(0, 6))}
                  className="mt-2 h-[52px] w-full rounded-lg border border-[#d8c5ff] px-4 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]"
                />
                {errors.pincode && <p className="mt-1 text-sm text-red-500">{errors.pincode}</p>}
              </div>

              <div>
                <label className="text-sm font-bold text-[#071d3a]">City</label>
                <input
                  type="text"
                  autoComplete="address-level2"
                  value={fetchingCity ? "Fetching..." : city}
                  onChange={(event) => setCity(event.target.value)}
                  className={`mt-2 h-[52px] w-full rounded-lg border border-[#d8c5ff] px-4 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2] ${fetchingCity ? "bg-[#f8fafc] text-[#a0aec0]" : ""}`}
                  readOnly={fetchingCity}
                />
                {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city}</p>}
              </div>

              <div>
                <label className="text-sm font-bold text-[#071d3a]">Employment Type</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEmployment("salaried")}
                    className={`h-[45px] rounded-lg border text-sm font-bold transition ${
                      employment === "salaried"
                        ? "border-[#8048e2] bg-[#8048e2] text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)]"
                        : "border-[#d8c5ff] bg-white text-[#52657d]"
                    }`}
                  >
                    Salaried
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployment("self")}
                    className={`h-[45px] rounded-lg border text-sm font-bold transition ${
                      employment === "self"
                        ? "border-[#8048e2] bg-[#8048e2] text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)]"
                        : "border-[#d8c5ff] bg-white text-[#52657d]"
                    }`}
                  >
                    Self-Employed
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-[#071d3a]">Monthly Income</label>
                <div className="mt-2 flex h-[54px] overflow-hidden rounded-lg border border-[#d8c5ff] bg-white focus-within:border-[#8048e2]">
                  <span className="flex w-[42px] items-center justify-center border-r border-[#d8c5ff] bg-[#f8fafc] text-lg font-semibold text-[#52657d]">
                    {"\u20b9"}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={income}
                    onChange={(event) => setIncome(formatAmount(event.target.value))}
                    className="min-w-0 flex-1 px-4 text-base font-semibold text-[#071d3a] outline-none"
                  />
                </div>
                {errors.income && <p className="mt-1 text-sm text-red-500">{errors.income}</p>}
              </div>

              <div>
                <label className="text-sm font-bold text-[#071d3a]">Income Received In</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
                  {["Account", "Cheque"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIncomeType(type)}
                      className={`h-[44px] rounded-lg border text-sm font-bold transition ${
                        incomeType === type
                          ? "border-[#8048e2] bg-[#8048e2] text-white"
                          : "border-[#d8c5ff] bg-white text-[#52657d]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {errors.incomeType && <p className="mt-1 text-sm text-red-500">{errors.incomeType}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Continue"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default BasicDetailsForm;
