import React, { useEffect, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import { useNavigate } from "react-router-dom";
import UserProgress from "./UserProgress";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const salaryDates = Array.from({ length: 31 }, (_, index) => index + 1);

const CompanyDetails = () => {
  const [form, setForm] = useState({
    company: "",
    designation: "",
    email: "",
    salaryDay: "",
    address: "",
    pincode: "",
    education: "",
    experience: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const applicationId =
      sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId");

    if (!applicationId) return;

    sessionStorage.setItem("applicationId", applicationId);
    setFetching(true);

    fetch(`${API_BASE_URL}/application/${applicationId}`)
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.message || "Failed to load work details");
        }

        return result.data || {};
      })
      .then((data) => {
        setForm({
          company: data.company_name || "",
          designation: data.designation || "",
          email: data.office_email || "",
          salaryDay: data.salary_day ? String(data.salary_day) : "",
          address: data.office_address || "",
          pincode: data.office_pincode || "",
          education: data.education || "",
          experience:
            data.experience_years === null || data.experience_years === undefined
              ? ""
              : String(data.experience_years),
        });
      })
      .catch((error) => {
        console.error("Work details load error:", error);
      })
      .finally(() => {
        setFetching(false);
      });
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined, submit: undefined });
  };

  const handleSalaryDaySelect = (day: number) => {
    setForm({ ...form, salaryDay: String(day) });
    setErrors({ ...errors, salaryDay: undefined, submit: undefined });
  };

  const validate = () => {
    const newErrors: any = {};

    if (!form.company.trim()) newErrors.company = "Company name is required";
    if (!form.designation.trim()) newErrors.designation = "Designation is required";

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!form.salaryDay) {
      newErrors.salaryDay = "Salary day is required";
    } else if (Number(form.salaryDay) < 1 || Number(form.salaryDay) > 31) {
      newErrors.salaryDay = "Enter salary day between 1 and 31";
    }

    if (!form.address.trim()) newErrors.address = "Address is required";

    if (!form.pincode.trim()) {
      newErrors.pincode = "Office pincode is required";
    } else if (!/^\d{6}$/.test(form.pincode)) {
      newErrors.pincode = "Enter valid 6-digit pincode";
    }

    if (!form.education) newErrors.education = "Select education";

    if (!form.experience.trim()) {
      newErrors.experience = "Experience is required";
    } else if (Number(form.experience) < 0 || Number(form.experience) > 50) {
      newErrors.experience = "Enter valid experience (0-50 years)";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
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
      const response = await fetch(`${API_BASE_URL}/application/work-details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: applicationId,
          company: form.company.trim(),
          designation: form.designation.trim(),
          email: form.email.trim(),
          salaryDay: Number(form.salaryDay),
          address: form.address.trim(),
          pincode: form.pincode.trim(),
          education: form.education,
          experience: Number(form.experience),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors({ submit: result.message || "Failed to save work details" });
        return;
      }

      navigate(result.data?.nextPath || "/user/bank-details");
    } catch (error) {
      console.error("Work details save error:", error);
      setErrors({ submit: "Server not reachable" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "mt-2 min-h-[52px] w-full rounded-lg border border-[#d8c5ff] px-4 py-3 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]";

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">

      <Navbar />

      <div className="flex-1 px-4 pb-16 pt-24 md:pt-28">
        <UserProgress activeStep={4} />

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white shadow-[0_18px_60px_rgba(32,56,85,0.10)]"
        >
          <div className="border-b border-[#dfe7f2] px-6 py-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eaff]">
              <BriefcaseBusiness className="h-7 w-7 text-[#8048e2]" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-[#071d3a]">
              Work Details
            </h1>
            <p className="mt-2 text-sm font-medium text-[#52657d]">
              {fetching ? "Loading saved details..." : "Your Data is Completely Secure with us"}
            </p>
          </div>

          <div className="px-5 py-7 sm:px-7 sm:py-8">
            {errors.submit && (
              <p className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
                {errors.submit}
              </p>
            )}

            {/* Company */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Company Name</label>
              <input name="company" autoComplete="organization" value={form.company} onChange={handleChange} className={inputClass} />
              {errors.company && <p className="text-red-500 text-xs">{errors.company}</p>}
            </div>

            {/* Designation */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Designation</label>
              <input name="designation" autoComplete="organization-title" value={form.designation} onChange={handleChange} className={inputClass} />
              {errors.designation && <p className="text-red-500 text-xs">{errors.designation}</p>}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">
                Office Email <span className="text-[#718096]">(optional)</span>
              </label>
              <input name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} className={inputClass} />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>

            {/* Salary Day */}
            <div className="mb-5">
              <label className="text-sm font-bold text-[#071d3a]">
                What is your Salary/Income Date?
              </label>
              <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-1.5">
                {salaryDates.map((date) => {
                  const isSelected = form.salaryDay === String(date);

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => handleSalaryDaySelect(date)}
                      className={`h-8 rounded-lg border text-xs font-bold transition-all duration-200 sm:h-10 sm:text-sm ${
                        isSelected
                          ? "border-[#262b4b] bg-[#262b4b] text-white shadow-[0_8px_18px_rgba(38,43,75,0.20)]"
                          : "border-[#e1e4e8] bg-white text-[#172231] hover:border-[#8048e2]"
                      }`}
                    >
                      {date}
                    </button>
                  );
                })}
              </div>
              {errors.salaryDay && <p className="text-red-500 text-xs">{errors.salaryDay}</p>}
            </div>

            {/* Address */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Office Address</label>
              <textarea name="address" rows={3} autoComplete="street-address" value={form.address} onChange={handleChange} className={inputClass} />
              {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
            </div>

            {/* Office Pincode */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Office Pincode</label>
              <input
                name="pincode"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={form.pincode}
                onChange={(event) => {
                  setForm({ ...form, pincode: event.target.value.replace(/\D/g, "").slice(0, 6) });
                  setErrors({ ...errors, pincode: undefined, submit: undefined });
                }}
                className={inputClass}
                placeholder="Enter office pincode"
              />
              {errors.pincode && <p className="text-red-500 text-xs">{errors.pincode}</p>}
            </div>

            {/* Education */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Education</label>
              <select name="education" autoComplete="off" value={form.education} onChange={handleChange} className={inputClass}>
                <option value="">Select</option>
                <option>10th</option>
                <option>12th</option>
                <option>Graduate</option>
                <option>Post Graduate</option>
              </select>
              {errors.education && <p className="text-red-500 text-xs">{errors.education}</p>}
            </div>

            {/* Experience */}
            <div className="mb-4">
              <label className="text-sm font-bold text-[#071d3a]">Work Experience (Years)</label>
              <input
                name="experience"
                type="number"
                autoComplete="off"
                value={form.experience}
                onChange={handleChange}
                className={inputClass}
              />
              {errors.experience && <p className="text-red-500 text-xs">{errors.experience}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || fetching}
              className="mt-3 h-[52px] w-full rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90 disabled:opacity-60"
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

export default CompanyDetails;
