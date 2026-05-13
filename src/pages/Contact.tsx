import Navbar from "@/Components/Navbar";
import { type FormEvent, useState } from "react";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import Footer from "@/Components/Footer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const Contact = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    mobile: "",
    email: "",
    message: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof typeof formData, string>>
  >({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]:
        field === "mobile"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));
    setFeedback("");
    setStatus("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Partial<Record<keyof typeof formData, string>> = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = "Please enter your full name.";
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      nextErrors.mobile = "Please enter a valid 10-digit mobile number.";
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setStatus("error");
      return;
    }

    setFieldErrors({});
    setStatus("loading");
    setFeedback("");

    try {
      const response = await fetch(`${API_BASE_URL}/application/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Unable to submit your request.");
      }

      setFormData({
        fullName: "",
        mobile: "",
        email: "",
        message: "",
      });
      setStatus("success");
      setFeedback("Thank you. Our team will contact you shortly.");
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "Server not reachable.");
    }
  };

  return (
    <>
      <Navbar />
      <section className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 md:py-32 py-24" id="contact">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Heading */}
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
              Contact <span className="text-primary">Waqt Money </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
              Get instant payday loans with quick approval. Apply now and receive funds directly in your account.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">

            {/* Left Info Cards */}
            <div className="space-y-6">
              {/* Cards */}
              <div className="space-y-5">

                {/* Address */}
                <div className="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <MapPin className="text-blue-700 dark:text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Office Location</h3>
                    <p className="text-gray-600 dark:text-slate-400 text-sm">
                     H-15 BSI Business Park, H Block, Sector 63, Noida <br /> Uttar Pradesh, India
                    </p>
                  </div>
                </div>

                {/* Contact */}
                <div className="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Phone className="text-green-700 dark:text-green-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Call Us</h3>
                    <p className="text-gray-600 dark:text-slate-400 text-sm">
                      +91 9217086608
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Mail className="text-purple-700 dark:text-purple-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Email Support</h3>
                    <p className="text-gray-600 dark:text-slate-400 text-sm">
                      support@waqtmoney.com
                    </p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Clock className="text-orange-700 dark:text-orange-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Working Hours</h3>
                    <p className="text-gray-600 dark:text-slate-400 text-sm">
                      Mon - Sat: 9AM - 7PM <br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 md:p-10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Contact Us
              </h3>

              <form className="space-y-5" onSubmit={handleSubmit}>

                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                    fieldErrors.fullName
                      ? "border-red-300 bg-red-50/40 focus:ring-red-100"
                      : "border-gray-300 bg-transparent focus:ring-blue-500 dark:border-slate-700"
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="-mt-3 text-sm font-medium text-red-600">
                    {fieldErrors.fullName}
                  </p>
                )}

                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="Mobile Number"
                  value={formData.mobile}
                  onChange={(event) => updateField("mobile", event.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                    fieldErrors.mobile
                      ? "border-red-300 bg-red-50/40 focus:ring-red-100"
                      : "border-gray-300 bg-transparent focus:ring-blue-500 dark:border-slate-700"
                  }`}
                />
                {fieldErrors.mobile && (
                  <p className="-mt-3 text-sm font-medium text-red-600">
                    {fieldErrors.mobile}
                  </p>
                )}

                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                    fieldErrors.email
                      ? "border-red-300 bg-red-50/40 focus:ring-red-100"
                      : "border-gray-300 bg-transparent focus:ring-blue-500 dark:border-slate-700"
                  }`}
                />
                {fieldErrors.email && (
                  <p className="-mt-3 text-sm font-medium text-red-600">
                    {fieldErrors.email}
                  </p>
                )}

                <textarea
                  rows={4}
                  autoComplete="off"
                  placeholder="Your message "
                  value={formData.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-transparent"
                />

                {feedback && (
                  <p
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      status === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {feedback}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "loading" ? "Submitting..." : "Submit"}
                </button>

              </form>
            </div>

          </div>
        </div>
      </section>
      <Footer/>
    </>
  );
};

export default Contact;
