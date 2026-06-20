import React, { useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import { useNavigate } from "react-router-dom";
import UserProgress from "./UserProgress";
import SelfieUpload from "./SelfieUpload";

import { API_BASE_URL, getApiHeaders } from "@/config/api";

type DocumentRequirement = {
  id: string;
  label: string;
  required: boolean;
};

const documentRequirements: DocumentRequirement[] = [
  { id: "selfie_photo", label: "Selfie Photo", required: true },
  { id: "current_salary_slip", label: "Salary Slip", required: false },
];

const getStoredApplicationId = () =>
  sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId") || "";
const getStoredApplicationMobile = () =>
  sessionStorage.getItem("applyPhone") || localStorage.getItem("applyPhone") || "";
const getStoredApplicationEmail = () =>
  sessionStorage.getItem("applyEmail") || localStorage.getItem("applyEmail") || "";
const getStoredApplicationPan = () =>
  sessionStorage.getItem("applyPan") || localStorage.getItem("applyPan") || "";
const getStoredApplicationUploadToken = () =>
  sessionStorage.getItem("applicationUploadToken") ||
  localStorage.getItem("applicationUploadToken") ||
  "";

const sessionExpiredMessage = "Application session expired. Please start again.";

const persistApplicationUploadToken = (token?: unknown) => {
  if (!token) return;

  sessionStorage.setItem("applicationUploadToken", String(token));
  localStorage.setItem("applicationUploadToken", String(token));
};

const readJsonResponse = async (res: Response) => {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: "Server returned an invalid response" };
  }
};

const recoverApplicationSession = async (applicationId: string) => {
  const response = await fetch(`${API_BASE_URL}/application/recover-session`, {
    method: "POST",
    credentials: "include",
    headers: getApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      applicationId,
      mobile: getStoredApplicationMobile(),
      email: getStoredApplicationEmail(),
      pan: getStoredApplicationPan(),
      applicationUploadToken: getStoredApplicationUploadToken(),
    }),
  });
  const result = await readJsonResponse(response);

  if (!response.ok || !result.success) {
    throw new Error(result.message || sessionExpiredMessage);
  }

  persistApplicationUploadToken(result.applicationUploadToken || result.data?.applicationUploadToken);
};

const SalarySlip = () => {
  const navigate = useNavigate();
  const [applicationId] = useState(getStoredApplicationId);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (documentId: string, fileList: FileList | null) => {
    setFiles((currentFiles) => ({
      ...currentFiles,
      [documentId]: fileList?.[0] || null,
    }));
  };

  const handleDirectFileChange = (documentId: string, file: File | null) => {
    setFiles((currentFiles) => ({
      ...currentFiles,
      [documentId]: file,
    }));
  };

  const validate = () => {
    if (!applicationId) {
      return "Application ID not found. Please start application again.";
    }

    const missingDocument = documentRequirements.find(
      (document) => document.required && !files[document.id]
    );

    if (missingDocument) {
      return `Please upload ${missingDocument.label}`;
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      try {
        await recoverApplicationSession(applicationId);
      } catch (recoverError) {
        console.warn("Application session recovery skipped:", recoverError);
      }

      const applicationMobile = getStoredApplicationMobile();
      const applicationEmail = getStoredApplicationEmail();
      const applicationPan = getStoredApplicationPan();
      const applicationUploadToken = getStoredApplicationUploadToken();
      const selectedDocuments = documentRequirements.filter(
        (document) => files[document.id] && document.label.trim()
      );
      const formData = new FormData();

      formData.append("id", applicationId);
      formData.append("applicationMobile", applicationMobile);
      formData.append("applicationEmail", applicationEmail);
      formData.append("applicationPan", applicationPan);
      formData.append("applicationUploadToken", applicationUploadToken);
      formData.append("current_step", "documents_uploaded");
      formData.append(
        "documentTypes",
        JSON.stringify(
          selectedDocuments.map(({ id, label }) => ({
            id,
            label: label.trim(),
            custom: false,
          }))
        )
      );

      selectedDocuments.forEach((document) => {
        const file = files[document.id];
        if (file) formData.append("files", file);
      });

      const response = await fetch(`${API_BASE_URL}/application/upload-docs`, {
        method: "POST",
        credentials: "include",
        headers: getApiHeaders(),
        body: formData,
      });
      const result = await readJsonResponse(response);

      if (!response.ok) {
        const message = result.message || "Document upload failed";

        if (response.status === 401 && message === sessionExpiredMessage) {
          setError("Application session could not be synced. Please go back to References, submit again, then upload documents.");
          return;
        }

        setError(message);
        return;
      }

      navigate(result.data?.nextPath || "/user/customer-video-kyc");
    } catch (fetchError) {
      console.error("Document upload error:", fetchError);
      setError("Upload request could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">
      <Navbar />

      <div className="flex-1 px-4 pb-16 pt-24 md:pt-28">
        <UserProgress activeStep={7} />

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white shadow-[0_18px_60px_rgba(32,56_85,0.10)]"
        >
          <div className="border-b border-[#dfe7f2] px-6 py-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eaff]">
              <UploadCloud className="h-7 w-7 text-[#8048e2]" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#071d3a]">
              Upload Documents
            </h2>
            <p className="mt-2 text-sm font-medium text-[#52657d]">
              Selfie verification is required. Salary slip is optional.
            </p>
           
          </div>

          <div className="space-y-5 px-5 py-7 sm:px-7 sm:py-8">
            {error && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            {documentRequirements.map((document) => (
              <div key={document.id}>
                {document.id === "selfie_photo" ? (
                  <SelfieUpload
                    file={files[document.id] || null}
                    onCapture={(file) => handleDirectFileChange(document.id, file)}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-bold text-[#071d3a]">
                        Upload {document.label}
                        {!document.required && (
                          <span className="ml-1 font-semibold text-[#52657d]">(Optional)</span>
                        )}
                      </label>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(event) => handleFileChange(document.id, event.target.files)}
                      className="mt-2 w-full rounded-lg border border-[#d8c5ff] p-3 text-sm font-semibold text-[#071d3a] file:mr-4 file:rounded-md file:border-0 file:bg-[#f3eaff] file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#8048e2]"
                    />
                    {files[document.id] && (
                      <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#52657d]">
                        <FileText className="h-3.5 w-3.5 text-[#8048e2]" />
                        {files[document.id]?.name}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-[52px] w-full rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Uploading..." : "Submit"}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default SalarySlip;
