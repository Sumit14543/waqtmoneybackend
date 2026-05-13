import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CreditCard,
  FileDown,
  IndianRupee,
  Loader2,
  LogOut,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

type DashboardLoan = {
  id: string;
  status: string;
  amount: number;
  repaymentAmount: number;
  disbursalDate?: string;
};

type DashboardData = {
  user?: {
    name?: string;
    mobile?: string;
  };
  credit?: {
    score?: number | null;
    label?: string;
    message?: string;
  };
  loans?: DashboardLoan[];
};

const formatINR = (amount: number) =>
  amount > 0
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "-";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const statusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("closed")) return "bg-green-50 text-green-700 ring-green-100";
  if (normalized.includes("active")) return "bg-[#f3eaff] text-[#8048e2] ring-[#d8c5ff]";
  if (normalized.includes("reject")) return "bg-red-50 text-red-700 ring-red-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
};

const InfoBox = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IndianRupee;
  label: string;
  value: string;
}) => (
  <div className="group rounded-2xl border border-purple-100 bg-white px-4 py-5 shadow-[0_12px_30px_rgba(91,33,182,0.06)] transition hover:-translate-y-0.5 hover:border-[#d8c5ff] hover:shadow-[0_18px_40px_rgba(91,33,182,0.12)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-[#52657d]">{label}</p>
        <h3 className="mt-2 break-words text-xl font-extrabold text-[#071d3a]">{value}</h3>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3eaff] text-[#8048e2] transition group-hover:bg-[#8048e2] group-hover:text-white">
        <Icon size={19} />
      </span>
    </div>
  </div>
);

const LoanDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingLoanId, setDownloadingLoanId] = useState("");

  const userName = useMemo(() => {
    const authUser = localStorage.getItem("authUser");
    if (data?.user?.name) return data.user.name;

    try {
      return JSON.parse(authUser || "{}")?.name || "Customer";
    } catch {
      return "Customer";
    }
  }, [data]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/auth/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          setError(result.message || result.error || "Unable to load dashboard");
          return;
        }

        setData(result.data || null);
      } catch (fetchError) {
        console.error("Dashboard load error:", fetchError);
        setError("Server not reachable");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    navigate("/login");
  };

  const downloadSanctionLetter = async (loanId: string) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login");
      return;
    }

    setDownloadingLoanId(loanId);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/sanction-letter/${encodeURIComponent(loanId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.message || result.error || "Unable to download sanction letter");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `WaqtMoney-Sanction-Letter-${loanId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Sanction letter download error:", downloadError);
      setError("Server not reachable");
    } finally {
      setDownloadingLoanId("");
    }
  };

  const loans = data?.loans || [];
  const creditLabel = data?.credit?.label || (loans.length ? "In Review" : "New");
  const totalRepayment = loans.reduce((sum, loan) => sum + (Number(loan.repaymentAmount) || 0), 0);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f1ff_0%,#fbfaff_44%,#ffffff_100%)] px-4 py-7 font-sans text-slate-950">
      <div className="mx-auto max-w-[1120px] space-y-7">
        <div className="relative overflow-hidden rounded-[30px] border border-purple-100 bg-white px-5 py-6 shadow-[0_28px_90px_rgba(91,33,182,0.14)] sm:px-8 sm:py-8">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#8048e2] via-[#bd56e4] to-[#f59e0b]" />
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#f3eaff] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#8048e2]">
                <Sparkles size={14} /> Waqt Money Dashboard
              </div>
              <h1 className="text-2xl font-extrabold leading-tight text-[#071d3a] sm:text-[32px]">
                Welcome back, {userName.toUpperCase()}!
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#52657d]">
                Keep your profile updated for faster loan processing.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-purple-100 bg-[#fbfaff] px-4 py-2 text-xs font-extrabold text-[#071d3a]">
                  {loans.length} Loan{loans.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-purple-100 bg-[#fbfaff] px-4 py-2 text-xs font-extrabold text-[#071d3a]">
                  {totalRepayment > 0 ? formatINR(totalRepayment) : "No dues"} Repayment
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-4 py-2 text-xs font-extrabold text-green-700">
                  <ShieldCheck size={14} /> Secure Account
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("/Repayment")}
                className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] px-4 text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90"
              >
                <CreditCard size={16} /> Repay
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white shadow-[0_9px_18px_rgba(220,38,38,0.18)] transition hover:bg-red-700"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-6 rounded-[22px] border border-purple-100 bg-[#fbfaff] px-5 py-6 shadow-[0_14px_34px_rgba(91,33,182,0.08)] sm:flex-row sm:items-center sm:px-8 sm:py-8">
              <div className="relative h-[105px] w-[150px] shrink-0">
                <div className="absolute left-0 top-0 h-[75px] w-[150px] overflow-hidden">
                  <div className="h-[150px] w-[150px] rotate-[-45deg] rounded-full border-[12px] border-transparent border-l-red-300 border-t-red-300" />
                  <div className="absolute left-0 top-0 h-[150px] w-[150px] rotate-[10deg] rounded-full border-[12px] border-transparent border-t-amber-200" />
                  <div className="absolute left-0 top-0 h-[150px] w-[150px] rotate-[55deg] rounded-full border-[12px] border-transparent border-t-[#a78bfa]" />
                </div>
                <span className="absolute left-[1px] top-[66px] h-3.5 w-3.5 rounded-full bg-red-500" />
                <p className="absolute left-[38px] top-[42px] text-xs font-semibold text-[#52657d]">Credit Score</p>
                <p className="absolute bottom-0 left-0 text-xs font-semibold text-[#52657d]">300</p>
                <p className="absolute bottom-0 right-0 text-xs font-semibold text-[#52657d]">900</p>
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#071d3a]">Credit Review</h2>
                <span className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-[#8048e2] shadow-[0_0_0_2px_rgba(128,72,226,0.16)]">
                  {creditLabel}
                </span>
                <p className="mt-4 max-w-[300px] text-sm font-medium leading-5 text-[#52657d]">
                  {data?.credit?.message || "Your profile will update as your application progresses."}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ebe3ff]">
                  <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-[#8048e2] to-[#bd56e4]" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 rounded-[22px] border border-purple-100 bg-[#fbfaff] px-5 py-5 shadow-[0_14px_34px_rgba(91,33,182,0.06)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3eaff] text-[#8048e2]">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#071d3a]">Financial Tip of the Day</h3>
                <p className="mt-2 max-w-[460px] text-sm font-medium leading-5 text-[#52657d]">
                  Keep your KYC documents updated to ensure quick processing of future loan requests.
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex min-h-[220px] items-center justify-center rounded-[26px] border border-purple-100 bg-white shadow-[0_24px_80px_rgba(91,33,182,0.10)]">
            <Loader2 className="h-8 w-8 animate-spin text-[#8048e2]" />
          </div>
        )}

        {error && <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{error}</div>}

        {!loading && !error && loans.length === 0 && (
          <div className="rounded-[26px] border border-purple-100 bg-white px-6 py-8 text-center shadow-[0_24px_80px_rgba(91,33,182,0.10)]">
            <ShieldCheck className="mx-auto h-10 w-10 text-[#8048e2]" />
            <h2 className="mt-3 text-xl font-extrabold text-[#071d3a]">No loan applications yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#52657d]">
              Start an application and it will appear here automatically.
            </p>
            <button
              type="button"
              onClick={() => navigate("/user/apply")}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] px-5 text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90"
            >
              <Plus size={16} /> Apply Now
            </button>
          </div>
        )}

        {loans.map((loan) => (
          <div key={loan.id} className="overflow-hidden rounded-[30px] border border-purple-100 bg-white shadow-[0_24px_80px_rgba(91,33,182,0.10)]">
            <div className="h-1 bg-gradient-to-r from-[#8048e2] via-[#bd56e4] to-[#f59e0b]" />
            <div className="px-5 py-6 sm:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-[#071d3a]">Loan #{loan.id}</h2>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${statusClass(loan.status)}`}>
                  {loan.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => downloadSanctionLetter(loan.id)}
                disabled={downloadingLoanId === loan.id}
                className="flex w-fit items-center gap-2 rounded-lg bg-[#8048e2] px-4 py-2 text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.20)] transition hover:bg-[#7138cf]"
              >
                {downloadingLoanId === loan.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileDown size={15} />
                )}
                Download Sanction Letter
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <InfoBox icon={IndianRupee} label="Loan Amount" value={formatINR(loan.amount)} />
              <InfoBox icon={ReceiptText} label="Repayment Amount" value={formatINR(loan.repaymentAmount)} />
              <InfoBox icon={CalendarDays} label="Disbursal Date" value={formatDate(loan.disbursalDate)} />
            </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoanDashboard;
