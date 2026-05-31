import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import UserProgress from "./UserProgress";

import { API_BASE_URL } from "@/config/api";

type ReferenceForm = {
  reference1Name: string;
  reference1Phone: string;
  reference1Relation: string;
  reference2Name: string;
  reference2Phone: string;
  reference2Relation: string;
};

type ReferenceErrors = Partial<Record<keyof ReferenceForm | "submit", string>>;

const relationOptions = ["Friend", "Family", "Colleague", "Relative", "Neighbour"];

const References = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ReferenceForm>({
    reference1Name: "",
    reference1Phone: "",
    reference1Relation: "",
    reference2Name: "",
    reference2Phone: "",
    reference2Relation: "",
  });
  const [errors, setErrors] = useState<ReferenceErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

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
          throw new Error(result.message || "Failed to load reference details");
        }

        return result.data || {};
      })
      .then((data) => {
        setForm({
          reference1Name: data.reference1_name || "",
          reference1Phone: data.reference1_mobile || "",
          reference1Relation: data.reference1_relation || "",
          reference2Name: data.reference2_name || "",
          reference2Phone: data.reference2_mobile || "",
          reference2Relation: data.reference2_relation || "",
        });
      })
      .catch((error) => {
        console.error("Reference details load error:", error);
      })
      .finally(() => {
        setFetching(false);
      });
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    const isPhone = name.endsWith("Phone");

    setForm((current) => ({
      ...current,
      [name]: isPhone ? value.replace(/\D/g, "").slice(0, 10) : value,
    }));
    setErrors((current) => ({ ...current, [name]: undefined, submit: undefined }));
  };

  const validate = () => {
    const nextErrors: ReferenceErrors = {};

    if (!form.reference1Name.trim()) nextErrors.reference1Name = "Reference 1 name is required";
    if (!/^[6-9]\d{9}$/.test(form.reference1Phone)) {
      nextErrors.reference1Phone = "Enter valid 10-digit mobile number";
    }
    if (!form.reference1Relation) nextErrors.reference1Relation = "Select relation";

    if (!form.reference2Name.trim()) nextErrors.reference2Name = "Reference 2 name is required";
    if (!/^[6-9]\d{9}$/.test(form.reference2Phone)) {
      nextErrors.reference2Phone = "Enter valid 10-digit mobile number";
    }
    if (!form.reference2Relation) nextErrors.reference2Relation = "Select relation";

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
      const response = await fetch(`${API_BASE_URL}/application/reference-details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: applicationId,
          reference1Name: form.reference1Name.trim(),
          reference1Mobile: form.reference1Phone,
          reference1Relation: form.reference1Relation,
          reference2Name: form.reference2Name.trim(),
          reference2Mobile: form.reference2Phone,
          reference2Relation: form.reference2Relation,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors({ submit: result.message || "Failed to save reference details" });
        return;
      }

      sessionStorage.setItem("referenceDetails", JSON.stringify(form));
      navigate(result.data?.nextPath || "/user/salary-slip");
    } catch (error) {
      console.error("Reference details save error:", error);
      setErrors({ submit: "Server not reachable" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "mt-2 h-[52px] w-full rounded-lg border border-[#d8c5ff] px-4 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]";

  const renderReference = (index: 1 | 2) => {
    const title = `Reference ${index}`;
    const subtitle = index === 1 ? "Primary reference contact" : "Secondary reference contact";
    const nameKey = `reference${index}Name` as keyof ReferenceForm;
    const phoneKey = `reference${index}Phone` as keyof ReferenceForm;
    const relationKey = `reference${index}Relation` as keyof ReferenceForm;

    return (
      <section className={index === 2 ? "border-t border-[#dfe7f2] pt-6" : ""}>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8048e2] text-sm font-bold text-white">
            {index}
          </span>
          <div>
            <h2 className="text-base font-bold text-[#071d3a]">{title}</h2>
            <p className="text-sm font-medium text-[#52657d]">{subtitle}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-[#071d3a]">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name={nameKey}
              autoComplete="name"
              value={form[nameKey]}
              onChange={handleChange}
              placeholder="Enter full name"
              className={inputClass}
            />
            {errors[nameKey] && <p className="mt-1 text-sm text-red-500">{errors[nameKey]}</p>}
          </div>

          <div>
            <label className="text-sm font-bold text-[#071d3a]">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              name={phoneKey}
              inputMode="numeric"
              autoComplete="tel"
              value={form[phoneKey]}
              onChange={handleChange}
              placeholder="Enter 10-digit mobile number"
              className={inputClass}
            />
            {errors[phoneKey] && <p className="mt-1 text-sm text-red-500">{errors[phoneKey]}</p>}
          </div>

          <div>
            <label className="text-sm font-bold text-[#071d3a]">
              Relation <span className="text-red-500">*</span>
            </label>
            <select
              name={relationKey}
              autoComplete="off"
              value={form[relationKey]}
              onChange={handleChange}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select relation</option>
              {relationOptions.map((relation) => (
                <option key={relation} value={relation}>
                  {relation}
                </option>
              ))}
            </select>
            {errors[relationKey] && (
              <p className="mt-1 text-sm text-red-500">{errors[relationKey]}</p>
            )}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">
      <Navbar />

      <div className="flex-1 px-4 pb-16 pt-24 md:pt-28">
        <UserProgress activeStep={6} />

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white shadow-[0_18px_60px_rgba(32,56,85,0.10)]"
        >
          <div className="border-b border-[#dfe7f2] px-6 py-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eaff]">
              <Users className="h-7 w-7 text-[#8048e2]" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-[#071d3a]">
              Reference Details
            </h1>
            <p className="mt-2 text-sm font-medium text-[#52657d]">
              {fetching
                ? "Loading saved details..."
                : "Add two contacts our verification team can reach if required."}
            </p>
          </div>

          <div className="space-y-6 px-5 py-7 sm:px-7 sm:py-8">
            {errors.submit && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
                {errors.submit}
              </p>
            )}

            {renderReference(1)}
            {renderReference(2)}

            <button
              type="submit"
              disabled={loading || fetching}
              className="h-[52px] w-full rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90 disabled:opacity-60"
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

export default References;
