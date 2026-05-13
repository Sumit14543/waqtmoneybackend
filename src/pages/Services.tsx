import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import { Banknote, Clock, ShieldCheck, Wallet, FileCheck, Headphones } from "lucide-react";
import { Link } from "react-router-dom";

const services = [
  {
    icon: Banknote,
    title: "Instant Payday Loans",
    description:
      "Get cash advances up to ₹2,00,000 against your next salary. Approved in minutes, disbursed within hours.",
  },
  {
    icon: Clock,
    title: "24-Hour Disbursal",
    description:
      "No long queues, no waiting. Funds transferred directly to your bank account within 24 hours of approval.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Confidential",
    description:
      "Bank-grade encryption keeps your data safe. Your employer is never contacted during the process.",
  },
  {
    icon: Wallet,
    title: "Flexible Repayment",
    description:
      "Repay on your next payday or split across 3 months. Choose what works for your budget.",
  },
  {
    icon: FileCheck,
    title: "Minimal Documentation",
    description:
      "Just your salary slip, ID proof, and bank statement. 100% paperless application from your phone.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description:
      "Our loan experts are available 7 days a week to guide you through every step in your language.",
  },
];

const Services = () => {
 
  return (
       <>
  <Navbar/>
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Our Services
          </span>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Payday Loans Made <span className="text-primary">Simple</span>
          </h1>

          <p className="mt-4 text-lg text-muted-foreground">
           Waqt Money offers fast, transparent, and stress-free payday loans designed for salaried
            professionals. Bridge the gap between paydays without the paperwork.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <div
                key={service.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-xl font-semibold text-card-foreground">
                  {service.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-4 rounded-2xl bg-primary p-10 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-primary-foreground">
              Need cash before payday?
            </h3>

            <p className="mt-1 text-primary-foreground/80">
              Apply now and get instant approval. No hidden charges.
            </p>
          </div>

          <Link
            to="/user/apply"
            className="inline-flex items-center justify-center rounded-full bg-background px-8 py-3 text-sm font-semibold text-primary shadow-lg transition-transform hover:scale-105"
          >
            Apply for Loan
          </Link>
        </div>

      </div>
    </section>
    <Footer />
     </>
  );
};

export default Services;
