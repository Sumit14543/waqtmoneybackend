import {
  AlertTriangle,
  BadgeHelp,
  BriefcaseBusiness,
  FileText,
  HelpCircle,
  Home,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import BrandLogo from "@/Components/BrandLogo";

const quickLinks = [
  { name: "Home", link: "/", icon: Home },
  { name: "Services", link: "/services", icon: BriefcaseBusiness },
  { name: "About Us", link: "/about", icon: Info },
  { name: "Contact Us", link: "/contact", icon: PhoneCall },
  { name: "FAQs", link: "/faqs", icon: HelpCircle },
];

const policies = [
  { name: "Privacy Policy", link: "/privacy-policies", icon: LockKeyhole },
  { name: "Terms & Conditions", link: "/terms-conditions", icon: FileText },
  { name: "Grievance Redressal", link: "/grievance-redressal", icon: BadgeHelp },
  { name: "Fair Practices Code", link: "/fair-practices-code", icon: FileText },
];

const contactItems = [
  { label: "Call Us", value: "+91 9217086608", icon: PhoneCall },
  { label: "Email", value: "support@waqtmoney.com", icon: Mail },
  { label: "Address", value: "H-15, Sector 63, Noida (UP)", icon: MapPin },
];

const Footer = () => {
  return (
    <footer className="w-full border-t border-purple-100 bg-[#faf9ff] text-slate-900">
      <div className="h-1 bg-gradient-to-r from-purple-600 via-violet-500 to-orange-400" />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_1fr_1.25fr] lg:gap-10">
          {/* Brand */}
          <div className="flex flex-col items-center sm:col-span-2 sm:items-start lg:col-span-1">
            <Link to="/" className="mb-4 inline-flex w-fit items-center justify-center">
              <BrandLogo className="h-14 w-auto object-contain md:-mt-3" />
            </Link>

            <p className="mx-auto max-w-sm text-sm leading-6 text-slate-600 sm:mx-0">
              Fast approvals, simple process, and secure digital loan support
              for salaried customers.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                Secure Process
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
                <LockKeyhole className="h-4 w-4 text-orange-500" />
                Data Protected
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-3 text-base font-semibold text-slate-950">
              Quick Links
            </h4>
            <span className="mb-4 block h-0.5 w-10 bg-purple-600" />

            <ul className="grid gap-3 text-sm text-slate-600">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.name}>
                    <Link
                      to={item.link}
                      className="inline-flex items-center gap-3 transition hover:text-purple-600"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-purple-600" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="mb-3 text-base font-semibold text-slate-950">
              Policies
            </h4>
            <span className="mb-4 block h-0.5 w-10 bg-orange-400" />

            <ul className="grid gap-3 text-sm text-slate-600">
              {policies.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.name}>
                    <Link
                      to={item.link}
                      className="inline-flex items-center gap-3 transition hover:text-purple-600"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-orange-500" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="mb-3 text-base font-semibold text-slate-950">
              Contact Info
            </h4>
            <span className="mx-auto mb-4 block h-0.5 w-10 bg-purple-600 sm:mx-0" />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {contactItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex min-w-0 items-center gap-3 rounded-lg border border-purple-100 bg-white px-3 py-3 text-left shadow-sm"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-purple-100 bg-white/85 p-4 text-center shadow-sm sm:p-5 sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
              <AlertTriangle className="h-5 w-5" />
            </span>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-950">
                Disclaimer
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Waqt Money facilitates loans in partnership with RBI-registered
                Non-Banking Financial Companies (NBFCs) and other regulated
                financial institutions. Loan sanction, amount, interest rate,
                and disbursal are subject to the applicant's eligibility and the
                sole discretion of the lending partner. Customers are advised to
                carefully review the applicable terms and conditions before
                applying.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-purple-100 pt-5 text-center text-xs text-slate-500 sm:text-left md:flex-row md:items-center md:justify-between">
          <p>&copy; 2026 Waqt Money. All rights reserved.</p>
          <p>NBFC Partner: Waqt Finance Pvt Ltd</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 md:justify-end">
            {/* <Link
              to="/privacy-policies"
              className="transition hover:text-purple-600"
            >
              Privacy Policy
            </Link>

            <Link
              to="/terms-conditions"
              className="transition hover:text-purple-600"
            >
              Terms
            </Link>

            <Link to="/contact" className="transition hover:text-purple-600">
              Support
            </Link> */}
            
            <p>RBI LICENCE NO.: B.10.00143</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
