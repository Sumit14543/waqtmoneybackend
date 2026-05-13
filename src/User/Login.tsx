import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import { ArrowRight, CheckCircle2, Lock, LogIn, Phone, ShieldCheck, User, UserPlus, X } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const Login = () => {
  const navigate = useNavigate();
  const [moved, setMoved] = useState(false);
  const [loginMobile, setLoginMobile] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupMobile, setSignupMobile] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignupSuccess = message.toLowerCase().includes("signup");

  const toggle = () => {
    setMoved(!moved);
    setError("");
    setMessage("");
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

  const normalizeMobileInput = (value: string) => value.replace(/\D/g, "").slice(0, 10);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();

    if (loading) return;

    if (!/^[6-9]\d{9}$/.test(loginMobile)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    if (!loginPassword) {
      setError("Enter your password");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: loginMobile, password: loginPassword }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || result.error || "Login failed");
        return;
      }

      localStorage.setItem("authToken", result.token || "");
      localStorage.setItem("authUser", JSON.stringify(result.user || {}));
      setMessage("Login successful");
      navigate("/user/dashboard");
    } catch (fetchError) {
      console.error("Login error:", fetchError);
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();

    if (loading) return;

    if (!signupName.trim()) {
      setError("Enter your name");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(signupMobile)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName.trim(),
          mobile: signupMobile,
          password: signupPassword,
        }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || result.error || "Signup failed");
        return;
      }

      setMessage(result.message || "Signup successful. Please login with your mobile number.");
      setLoginMobile(signupMobile);
      setLoginPassword("");
      setSignupPassword("");
      setMoved(false);
    } catch (fetchError) {
      console.error("Signup error:", fetchError);
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  const loginForm = (
    <form onSubmit={handleLogin} className="flex flex-col justify-center">
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
          <LogIn className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-2xl font-black text-slate-950">Login with Mobile</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Enter your registered details.</p>
      </div>

      <div className="relative mb-4">
        <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={loginMobile}
          onChange={(event) => setLoginMobile(normalizeMobileInput(event.target.value))}
          placeholder="Mobile Number"
          className="h-14 w-full rounded-xl border border-purple-100 p-3 pl-11 text-base font-bold outline-none transition focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
        />
      </div>

      <div className="relative mb-4">
        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="password"
          autoComplete="current-password"
          value={loginPassword}
          onChange={(event) => setLoginPassword(event.target.value)}
          placeholder="Password"
          className="h-14 w-full rounded-xl border border-purple-100 p-3 pl-11 text-base font-bold outline-none transition focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700 disabled:opacity-60"
      >
        {loading ? "Please wait..." : "Login"}
        {!loading && <ArrowRight className="h-5 w-5" />}
      </button>

      <button
        type="button"
        onClick={toggle}
        className="mt-4 text-center text-sm font-bold text-purple-700 transition hover:text-purple-900"
      >
        Create account
      </button>
    </form>
  );

  const signupForm = (
    <form onSubmit={handleSignup} className="flex flex-col justify-center">
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
          <UserPlus className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-2xl font-black text-slate-950">Create Account</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Signup, then login to your dashboard.</p>
      </div>

      <div className="relative mb-4">
        <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          autoComplete="name"
          value={signupName}
          onChange={(event) => setSignupName(event.target.value)}
          placeholder="Name"
          className="h-14 w-full rounded-xl border border-purple-100 p-3 pl-11 text-base font-bold outline-none transition focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
        />
      </div>

      <div className="relative mb-4">
        <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={signupMobile}
          onChange={(event) => setSignupMobile(normalizeMobileInput(event.target.value))}
          placeholder="Mobile Number"
          className="h-14 w-full rounded-xl border border-purple-100 p-3 pl-11 text-base font-bold outline-none transition focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
        />
      </div>

      <div className="relative mb-4">
        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="password"
          autoComplete="new-password"
          value={signupPassword}
          onChange={(event) => setSignupPassword(event.target.value)}
          placeholder="Password"
          className="h-14 w-full rounded-xl border border-purple-100 p-3 pl-11 text-base font-bold outline-none transition focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700 disabled:opacity-60"
      >
        {loading ? "Please wait..." : "Signup"}
        {!loading && <ArrowRight className="h-5 w-5" />}
      </button>

      <button
        type="button"
        onClick={toggle}
        className="mt-4 text-center text-sm font-bold text-purple-700 transition hover:text-purple-900"
      >
        Login instead
      </button>
    </form>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,#f3e8ff_0,#f8f6ff_32%,#ffffff_100%)] pt-20">
      <Navbar />

      <div className="flex flex-1 items-center justify-center px-3 py-8 sm:px-4 sm:py-12">
        <div className="flex min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-[26px] border border-purple-100 bg-white shadow-[0_24px_70px_rgba(91,33,182,0.16)] md:min-h-[540px] md:flex-row">
          <div className="relative flex w-full flex-col justify-between overflow-hidden bg-slate-950 p-6 text-white sm:p-8 md:w-1/2">
            <div className="absolute right-[-90px] top-[-90px] h-56 w-56 rounded-full bg-purple-500/20" />
            <div className="absolute bottom-[-120px] left-[-120px] h-64 w-64 rounded-full bg-orange-400/10" />
            <div>
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-orange-300 ring-1 ring-white/10">
                <ShieldCheck className="h-8 w-8" />
              </span>
              <h1 className="text-4xl font-black">Waqt Money</h1>
              <p className="mt-3 max-w-sm text-base font-semibold leading-7 text-slate-300">
                Securely access your loan dashboard, repayments, and application journey.
              </p>
            </div>
            <div className="relative mt-8 rounded-2xl border border-white/10 bg-white/[0.07] p-5 text-sm font-semibold leading-6 text-slate-200">
              Login using your registered mobile number to continue your loan journey securely.
            </div>
          </div>

          <div className="w-full overflow-hidden md:w-1/2">
            <div
              className={`hidden w-[200%] transition-transform duration-500 md:flex ${
                moved ? "-translate-x-1/2" : "translate-x-0"
              }`}
            >
              <div className="flex w-1/2 flex-col justify-center p-7 lg:p-10">{loginForm}</div>
              <div className="flex w-1/2 flex-col justify-center p-7 lg:p-10">{signupForm}</div>
            </div>

            <div className="p-5 sm:p-6 md:hidden">{!moved ? loginForm : signupForm}</div>

            {(error || (message && !isSignupSuccess)) && (
              <div className="px-5 pb-5 sm:px-6 md:px-8 lg:px-10">
                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>
                )}
                {message && !isSignupSuccess && (
                  <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{message}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isSignupSuccess && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
            <button
              type="button"
              onClick={() => setMessage("")}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
            <CheckCircle2 className="mx-auto mt-1 h-14 w-14 text-green-600" />
            <h3 className="mt-4 text-2xl font-black text-slate-950">Account Created</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Signup successful. Login with your mobile number to open your dashboard.
            </p>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="mt-5 h-12 w-full rounded-xl bg-purple-600 text-sm font-black text-white transition hover:bg-purple-700"
            >
              Continue to Login
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Login;
