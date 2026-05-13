import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import { BadgeCheck, CheckCheck, FileText, Wallet } from "lucide-react";

const loanProcessSteps = [
  {
    title: "Submit Application",
    description:
      "Fill out our simple online form with basic details and required documents.",
    icon: FileText,
    color: "bg-red-500",
  },
  {
    title: "Document Verification",
    description:
      "Our team verifies your documents and assesses your loan eligibility.",
    icon: BadgeCheck,
    color: "bg-green-600",
  },
  {
    title: "Loan Approval",
    description:
      "Receive approval notification with loan amount and terms confirmation.",
    icon: CheckCheck,
    color: "bg-teal-600",
  },
  {
    title: "Fund Disbursement",
    description:
      "Funds are transferred directly to your bank account after e-signing.",
    icon: Wallet,
    color: "bg-blue-600",
  },
];

export default function About() {
  return (
    <>
      <Navbar />

      <section className="w-full bg-gradient-to-b from-white to-indigo-50 py-20 md:py-28">
        
        {/* Heading */}
        <div className="text-center mb-16 px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-800">
            About <span className="text-primary">Waqt Money </span>
          </h2>
         

          <p className="mt-5 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
            Your trusted partner for quick and hassle-free payday loans when you need instant cash support.
          </p>
        </div>

        {/* Main Section */}
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20 px-4">
          
          {/* Image */}
          <div className="relative w-full max-w-md lg:max-w-lg">
            <img
              className="w-full h-[300px] sm:h-[400px] lg:h-[500px] object-cover rounded-3xl shadow-xl"
              src="/about-img.jpg"
              alt="Waqt Money Payday Loan"
            />

            {/* Floating Card */}
            <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-auto bg-white p-4 rounded-xl shadow-lg flex items-center gap-3">
              
              <div className="flex -space-x-3">
                <img
                  src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200"
                  className="w-9 h-9 rounded-full border-2 border-white"
                />
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200"
                  className="w-9 h-9 rounded-full border-2 border-white"
                />
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200"
                  className="w-9 h-9 rounded-full border-2 border-white"
                />
                <div className="flex items-center justify-center text-xs text-white w-9 h-9 rounded-full bg-indigo-600 border-2 border-white">
                  50K+
                </div>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                Trusted by 50,000+ professionals
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-xl text-center lg:text-left">
            <h1 className="text-2xl md:text-4xl font-bold text-slate-800 leading-tight">
              Instant Payday Loans for Your Short-Term Needs
            </h1>

            <div className="w-24 h-1 mt-4 mx-auto lg:mx-0 rounded-full bg-gradient-to-r from-indigo-600 to-purple-400"></div>

            <p className="mt-6 text-sm md:text-lg text-slate-600 leading-relaxed">
              Waqt Money provides quick and easy payday loans to salaried individuals across India.
              Whether it's an emergency expense or a temporary cash shortage, we help you get funds instantly.
            </p>

            <p className="mt-4 text-sm md:text-lg text-slate-600 leading-relaxed">
              With a simple online process, minimal documentation, and fast approvals,
              you can access funds within hours—no long waiting, no complicated paperwork.
            </p>

            <p className="mt-4 text-sm md:text-lg text-slate-600 leading-relaxed">
              Our goal is to make borrowing simple, transparent, and stress-free
              so you can focus on what matters most.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center lg:justify-start">
              

             
            </div>
          </div>
        </div>
      </section>

      
      <section className="bg-[linear-gradient(135deg,#f8fafc,#fff7ed)] px-4 py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-500">
              Fast Funding
            </span>

            <h2 className="mt-4 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
              Your Dreams,{" "}
              <span className="text-purple-600">Funded Fast.</span>
            </h2>

            <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-orange-400 to-purple-600 lg:mx-0" />

            <p className="mt-6 text-sm leading-7 text-slate-600 md:text-base">
              Life is full of unexpected moments, and when they strike, you need
              financial support you can rely on. Waqt Money provides quick,
              hassle-free loans designed to give you access to funds without the
              stress of paperwork.
            </p>

            <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
              From instant approvals to direct transfers, every step is crafted
              for your convenience. With simplicity, transparency, and
              flexibility at the core, Waqt Money ensures help reaches you
              exactly when you need it.
            </p>

           
          </div>

          <div className="order-1 overflow-hidden rounded-2xl border border-orange-100 shadow-xl shadow-orange-100/60 lg:order-2">
            <img
              src="/about1-img.jpg"
              alt="Waqt Money quick funding discussion"
              className="h-[280px] w-full object-cover sm:h-[360px] lg:h-[430px]"
            />
          </div>
        </div>
      </section>

      <section className="processLoan bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-slate-950 md:text-5xl">
            Payday Loan <span className="text-black">Process</span>
          </h2>

          <div className="relative mx-auto mt-20 grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div className="absolute left-[8%] right-[8%] top-9 hidden h-1.5 rounded-full bg-gradient-to-r from-purple-600 to-teal-400 lg:block" />
            <div className="absolute left-1/2 top-0 hidden h-full w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-600 to-teal-400 max-md:block" />

            {loanProcessSteps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="relative z-10 mx-auto w-full max-w-[320px] rounded-xl rounded-bl-[72px] rounded-tr-[72px] border-2 border-orange-400 bg-white px-5 pb-7 pt-16 text-center shadow-lg shadow-slate-200/70 transition duration-300 hover:-translate-y-1"
                >
                  <span
                    className={`absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white text-white shadow-[0_0_0_3px_#e2e8f0] ${step.color}`}
                  >
                    <Icon className="h-7 w-7" />
                  </span>

                  <h3 className="text-lg font-bold text-slate-950">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
