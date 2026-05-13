import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import {
  CheckCircle2,
  Cookie,
  Database,
  FileText,
  Lock,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Users,
} from "lucide-react";

const sections = [
  {
    id: "information",
    icon: Database,
    title: "Information We Collect",
    points: [
      "Personal details like name, mobile number, email, PAN, Aadhaar, address, and date of birth.",
      "Financial details like income, employment information, bank details, and requested loan amount.",
      "Technical details like device information, browser type, IP address, cookies, and website usage data.",
    ],
  },
  {
    id: "usage",
    icon: Users,
    title: "How We Use Your Data",
    points: [
      "To verify your identity, check eligibility, process applications, and provide customer support.",
      "To send important updates related to your loan application, repayment, and account activity.",
      "To improve our services, website experience, fraud prevention, and security systems.",
    ],
  },
  {
    id: "sharing",
    icon: ShieldCheck,
    title: "Data Sharing",
    points: [
      "We do not sell your personal information.",
      "Information may be shared with lending partners, NBFC partners, credit bureaus, verification agencies, payment partners, or regulators when required.",
      "Only the information needed to provide, verify, secure, or improve our services is shared.",
    ],
  },
  {
    id: "security",
    icon: Lock,
    title: "Data Security",
    points: [
      "We use reasonable technical, administrative, and physical safeguards to protect your information.",
      "Sensitive information is handled through secured systems and access controls.",
      "No online platform can guarantee absolute security, but we continuously work to reduce risk.",
    ],
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "Cookies",
    points: [
      "We may use cookies to remember preferences, analyze website traffic, and improve performance.",
      "You can manage or disable cookies from your browser settings.",
    ],
  },
  {
    id: "rights",
    icon: FileText,
    title: "Your Rights",
    points: [
      "You may request access, correction, or deletion of your personal information, subject to legal requirements.",
      "You can opt out of promotional communication while still receiving important service messages.",
    ],
  },
  {
    id: "updates",
    icon: RefreshCcw,
    title: "Policy Updates",
    points: [
      "We may update this Privacy Policy from time to time.",
      "All changes will be posted on this page with an updated effective date.",
    ],
  },
];

const highlights = [
  "No sale of personal data",
  "Secure digital verification",
  "Limited partner sharing",
  "User data rights supported",
];

export default function Policies() {
  return (
    <>
      <Navbar />

      <main className="bg-gradient-to-b from-white via-[#fbf9ff] to-white pt-24">
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700">
              <ShieldCheck className="h-4 w-4" />
              Privacy & Data Protection
            </div>

            <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
              Privacy <span className="text-gradient">Policy</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              This policy explains how Waqt Money collects, uses, protects, and
              shares your information when you use our website and loan services.
            </p>

            {/* <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              <span className="rounded-full border border-purple-100 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm">
                Effective Date: 04 May 2026
              </span>
              <span className="rounded-full border border-orange-100 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm">
                Waqt Money Services
              </span>
            </div> */}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-xl border border-purple-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  On This Page
                </h2>
                <nav className="mt-4 space-y-2">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-purple-50 hover:text-purple-700"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="mt-5 rounded-xl border border-purple-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  Key Points
                </h2>
                <ul className="mt-4 space-y-3">
                  {highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="space-y-5">
              {sections.map((section) => {
                const Icon = section.icon;

                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-28 rounded-xl border border-purple-100 bg-white p-5 shadow-sm md:p-7"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h2 className="text-xl font-bold text-slate-950">
                        {section.title}
                      </h2>
                    </div>

                    <ul className="mt-5 space-y-3">
                      {section.points.map((point) => (
                        <li
                          key={point}
                          className="flex gap-3 text-sm leading-7 text-slate-600"
                        >
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}

              <section className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-600 to-violet-600 p-5 text-white shadow-sm md:p-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Privacy Questions?</h2>
                    <p className="mt-2 text-sm leading-6 text-purple-50">
                      For privacy concerns, corrections, or data requests,
                      contact our support team.
                    </p>
                  </div>
                  <a
                    href="mailto:support@waqtmoney.com"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-purple-700 transition hover:bg-purple-50"
                  >
                    <Mail className="h-4 w-4" />
                    Email Support
                  </a>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
