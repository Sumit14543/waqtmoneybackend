import React, { useEffect, useState } from "react";
import { IdCard } from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import UserProgress from "./UserProgress";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL, getApiHeaders } from "@/config/api";

const KycAadhaar = () => {
  const navigate = useNavigate();
  const [aadhaar, setAadhaar] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [aadhaarMasked, setAadhaarMasked] = useState(() => sessionStorage.getItem("aadhaarMasked") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const showError = async (message: string) => {
    setError(message);

    await Swal.fire({
      icon: "error",
      title: "Action needed",
      html: `<p class="mx-auto max-w-[300px] text-sm font-medium leading-6 text-slate-600">${escapeHtml(message)}</p>`,
      width: 420,
      padding: "2rem 1.75rem 1.5rem",
      background: "#ffffff",
      color: "#071d3a",
      iconColor: "#ef646c",
      backdrop: "rgba(15, 23, 42, 0.58)",
      confirmButtonText: "Got it",
      buttonsStyling: false,
      customClass: {
        popup:
          "rounded-[22px] border border-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.22)]",
        icon: "mt-1 border-[3px]",
        title: "pt-2 text-[24px] font-extrabold tracking-normal text-slate-950",
        htmlContainer: "mt-1",
        actions: "mt-6",
        confirmButton:
          "inline-flex h-11 min-w-[120px] items-center justify-center rounded-xl bg-gradient-to-r from-[#8048e2] to-[#bd56e4] px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(128,72,226,0.28)] outline-none transition hover:opacity-95 focus-visible:ring-4 focus-visible:ring-purple-200",
      },
    });
  };

  useEffect(() => {
    const aadhaarStatus = new URLSearchParams(window.location.search).get("aadhaar");
    const applicationId =
      sessionStorage.getItem("applicationId") ||
      localStorage.getItem("applicationId") ||
      localStorage.getItem("aadhaarPendingApplicationId");

    if (aadhaarStatus === "failed" || aadhaarStatus === "expired") {
      setLoading(true);
      setError("");
      fetch(`${API_BASE_URL}/react-aadhaar/complete`, {
        method: "POST",
        credentials: "include",
        headers: getApiHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ id: applicationId || "" }),
      })
        .then(async (response) => {
          const result = await readJsonResponse(response);
          if (!response.ok || !result.success) {
            throw new Error(result.message || "Aadhaar verification failed. Please try again.");
          }

          const masked = result.data?.aadhaarMasked || "";
          if (masked) {
            setAadhaarMasked(masked);
            sessionStorage.setItem("aadhaarMasked", masked);
          }

          localStorage.removeItem("aadhaarPendingApplicationId");
          navigate(result.data?.nextPath || "/user/work-details", { replace: true });
        })
        .catch((completeError) => {
          console.error("Aadhaar completion error:", completeError);
          setError(
            aadhaarStatus === "expired"
              ? "Aadhaar verification session expired. Please try again."
              : "Aadhaar verification failed. Please try again."
          );
        })
        .finally(() => setLoading(false));
    }

    let savedPan = sessionStorage.getItem("applyPan") || "";
    const savedPanVerification = sessionStorage.getItem("panVerification");
    if (savedPanVerification) {
      try {
        const panDetails = JSON.parse(savedPanVerification);
        if (panDetails?.pan) savedPan = String(panDetails.pan);
        if (panDetails?.name) setApplicantName(String(panDetails.name));
        if (panDetails?.aadhaarMasked) {
          setAadhaarMasked(String(panDetails.aadhaarMasked));
          sessionStorage.setItem("aadhaarMasked", String(panDetails.aadhaarMasked));
        }
      } catch {
        // Ignore malformed session data; application fetch below can still fill the name.
      }
    }

    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(savedPan)) {
      fetch(`${API_BASE_URL}/pan/verify`, {
        method: "POST",
        credentials: "include",
        headers: getApiHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          pan: savedPan,
          applicationId,
          termsAccepted: true,
        }),
      })
        .then(async (response) => {
          const result = await response.json().catch(() => ({}));
          if (!response.ok) return null;
          return result;
        })
        .then((result) => {
          const masked = result?.aadhaarMasked || result?.aadhaar_masked || "";
          const formattedMasked = formatMaskedAadhaar(String(masked));

          if (formattedMasked) {
            setAadhaarMasked(masked);
            sessionStorage.setItem("aadhaarMasked", String(masked));
          }
        })
        .catch((fetchError) => {
          console.error("PAN Aadhaar preview load error:", fetchError);
        });
    }

    if (!applicationId) return;

    fetch(`${API_BASE_URL}/application/${applicationId}`, {
      credentials: "include",
      headers: getApiHeaders(),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) return null;
        return result.data || {};
      })
      .then((data) => {
        if (!data) return;

        const name = data.full_name || data.name || data.customer_name || "";
        const masked = data.aadhaar_masked || data.aadhaarMasked || "";

        if (name) setApplicantName(String(name));
        if (masked) {
          setAadhaarMasked(String(masked));
          sessionStorage.setItem("aadhaarMasked", String(masked));
        }
      })
      .catch((fetchError) => {
        console.error("Aadhaar preview load error:", fetchError);
      });
    // Bootstrap saved Aadhaar/PAN context once on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // format: 1234 5678 9012
  const formatAadhaar = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 12);

    const parts = cleaned.match(/.{1,4}/g);
    return parts ? parts.join(" ") : "";
  };

  const handleChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 12);
    setAadhaar(cleaned);
    setAadhaarMasked("");
    setError("");
  };

  const maskAadhaar = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 12);
    if (cleaned.length < 4) return "";
    return `XXXX XXXX ${cleaned.slice(-4)}`;
  };

  const formatMaskedAadhaar = (value: string) => {
    const cleaned = value.replace(/\s/g, "");

    if (!cleaned) return "";

    if (/^\d{12}$/.test(cleaned)) {
      return `XXXX XXXX ${cleaned.slice(-4)}`;
    }

    if (/^X{8}\d{4}$/i.test(cleaned)) {
      return `XXXX XXXX ${cleaned.slice(-4)}`;
    }

    if (/^\d{2}X{8}\d{2}$/i.test(cleaned)) {
      return `${cleaned.slice(0, 2)}XX XXXX XX${cleaned.slice(-2)}`;
    }

    if (/^X{8,}\d{2}$/i.test(cleaned)) {
      return `XX XXXX XX${cleaned.slice(-2)}`;
    }

    if (/^\d+X+\d{1,3}$/i.test(cleaned)) {
      const lastDigits = cleaned.match(/\d{1,3}$/)?.[0] || "";
      return cleaned.length >= 4 && lastDigits.length === 2
        ? `${cleaned.slice(0, 2)}XX XXXX XX${lastDigits}`
        : "";
    }

    const trailingDigits = cleaned.match(/\d{4}$/);
    if (trailingDigits) return `XXXX XXXX ${trailingDigits[0]}`;

    return "";
  };

  const previewName = applicantName || "Your Name";
  const previewMaskedAadhaar = maskAadhaar(aadhaar) || formatMaskedAadhaar(aadhaarMasked) || "XXXX XXXX XXXX";

  const readJsonResponse = async (res: Response) => {
    const text = await res.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        invalidResponse: true,
        message:
          res.status === 404
            ? "Aadhaar service is not available on the server. Please try again after deployment completes."
            : "Server is not returning a valid response. Please try again shortly.",
      };
    }
  };

  const handleSubmit = async () => {
    if (loading || skipLoading) return;

    if (aadhaar.length !== 12) {
      showError("Enter valid 12-digit Aadhaar number");
      return;
    }

    const applicationId =
      sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId");

    if (!applicationId) {
      showError("Application session not found. Please start again.");
      return;
    }

    sessionStorage.setItem("applicationId", applicationId);
    localStorage.setItem("applicationId", applicationId);
    localStorage.setItem("aadhaarPendingApplicationId", applicationId);

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/react-aadhaar/start`, {
        method: "POST",
        credentials: "include",
        headers: getApiHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: applicationId,
          aadhaar,
        }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        showError(result.message || "Failed to save Aadhaar");
        return;
      }

      const masked = result.data?.aadhaarMasked || "";
      setAadhaarMasked(masked);
      sessionStorage.setItem("aadhaarMasked", masked);

      if (result.data?.nextPath) {
        localStorage.removeItem("aadhaarPendingApplicationId");
        navigate(result.data.nextPath);
        return;
      }

      if (result.data?.authorizationUrl) {
        window.location.href = result.data.authorizationUrl;
        return;
      }

      localStorage.removeItem("aadhaarPendingApplicationId");
      navigate("/user/work-details");
    } catch (fetchError) {
      console.error("Aadhaar save error:", fetchError);
      showError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (loading || skipLoading) return;

    const applicationId =
      sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId");

    if (!applicationId) {
      showError("Application session not found. Please start again.");
      return;
    }

    sessionStorage.setItem("applicationId", applicationId);
    localStorage.setItem("applicationId", applicationId);
    sessionStorage.setItem("aadhaarVerificationSkipped", "true");
    localStorage.removeItem("aadhaarPendingApplicationId");

    setSkipLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/react-aadhaar/skip`, {
        method: "POST",
        credentials: "include",
        headers: getApiHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: applicationId,
          applicationId,
        }),
      });

      const result = await readJsonResponse(response);

      if (response.status === 404 || result.invalidResponse) {
        navigate("/user/work-details");
        return;
      }

      if (!response.ok || !result.success) {
        showError(result.message || "Failed to skip Aadhaar verification");
        return;
      }

      navigate(result.data?.nextPath || "/user/work-details");
    } catch (fetchError) {
      console.error("Aadhaar skip error:", fetchError);
      navigate("/user/work-details");
    } finally {
      setSkipLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">
      <Navbar />

      <div className="flex-1 px-3 pb-16 pt-24 sm:px-4 md:pt-28">
        <UserProgress activeStep={3} />

        <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white text-center shadow-[0_18px_60px_rgba(32,56,85,0.10)]">
          <div className="border-b border-[#dfe7f2] px-5 py-7 sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eaff]">
              <IdCard className="h-7 w-7 text-[#8048e2]" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#071d3a]">
              Complete Your KYC
            </h2>
            
          </div>

          <div className="px-4 py-6 sm:px-5">
            <div className="relative mx-auto mb-5 w-full max-w-[450px] overflow-hidden rounded-lg">
              <img
                src="/aadharcard-img.png"
                alt="Aadhaar Preview"
                className="w-full object-contain"
              />
              <div className="absolute bottom-[37%] left-[31%] right-[6%] text-left min-[420px]:bottom-[39%]">
                
                <p className="truncate text-[11px] font-extrabold uppercase leading-tight tracking-wide text-[#172231] min-[420px]:text-sm md:text-[23px]">
                  {previewName}
                </p>
                
                <p className="mt-1 whitespace-nowrap text-[11px] font-extrabold leading-none tracking-[0.06em] text-gray-500 min-[420px]:mt-2 min-[420px]:text-base md:text-[17px]">
                  {previewMaskedAadhaar}
                </p>
              </div>
            </div>

           
            {error && (
              <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

          {/* INPUT */}
            <div className="text-left">
              <label className="text-sm font-bold text-[#071d3a]">
                Enter Your Complete Aadhaar Number
              </label>

            <input
              type="text"
              autoComplete="off"
              value={formatAadhaar(aadhaar)}
              onChange={(e) => handleChange(e.target.value)}
              maxLength={14} // includes spaces
              placeholder="1234 5678 9012"
              className="mt-2 h-[52px] w-full rounded-lg border border-[#d8c5ff] px-4 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]"
              />
            </div>

          {/* BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={loading || skipLoading}
            className="mt-5 h-[52px] w-full rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default KycAadhaar;
