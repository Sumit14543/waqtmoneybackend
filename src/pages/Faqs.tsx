import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import React from "react";

const Faqs = () => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "What is a Payday Loan at Waqt Money?",
      answer:
        "Waqt Money provides short-term payday loans that help you access a portion of your upcoming salary before your payday. It is designed for salaried individuals who need quick funds for urgent expenses without lengthy paperwork or delays.",
    },
    {
      question: "Who can apply for a Waqt Money loan?",
      answer:
        "Any salaried employee aged between 21 to 60 years with a stable monthly income can apply. Applicants must have a valid bank account, PAN card, Aadhaar card, and a steady employment record.",
    },
    {
      question: "How much loan amount can I get?",
      answer:
        "You can avail loans ranging from Rs. 5,000 to Rs. 2,00,000 depending on your salary, repayment capacity, and credit profile. Waqt Money ensures flexible limits to suit your financial needs.",
    },
    {
      question: "How quickly will I receive the loan?",
      answer:
        "Once your application is approved, the loan amount is usually disbursed within a few hours directly to your bank account. In some cases, it may take up to 24 hours.",
    },
    {
      question: "What documents are required?",
      answer:
        "Basic documents include Aadhaar Card, PAN Card, recent salary slips, and bank statements. In most cases, the process is completely digital with minimal paperwork.",
    },
    {
      question: "Is Waqt Money safe and secure?",
      answer:
        "Yes, Waqt Money uses advanced encryption and secure systems to protect your personal and financial data. Your information is never shared without consent.",
    },
    {
      question: "What is the repayment tenure?",
      answer:
        "Repayment tenure typically ranges from a few days to one month, aligned with your next salary cycle. Some flexible repayment options may also be available.",
    },
    {
      question: "Are there any hidden charges?",
      answer:
        "No, Waqt Money maintains full transparency. All fees, interest rates, and charges are clearly communicated before loan approval.",
    },
    {
      question: "What happens if I miss a repayment?",
      answer:
        "Missing a repayment may attract late fees and impact your credit score. We recommend repaying on time or contacting our support team for assistance in case of financial difficulty.",
    },
    {
      question: "Can I apply multiple times?",
      answer:
        "Yes, you can apply again after successfully repaying your previous loan. Waqt Money also rewards responsible borrowers with higher limits and better offers.",
    },
    {
      question: "Is there any credit score requirement?",
      answer:
        "While a good credit score improves approval chances, Waqt Money also considers other factors like income stability and repayment capacity.",
    },
    {
      question: "How do I apply for a loan?",
      answer:
        "You can apply directly through the Waqt Money website by filling out a simple online form. The process takes only a few minutes to complete.",
    },
  ];

  return (
    <>
      <Navbar />

      <section className="flex w-full flex-col items-center justify-center px-4 py-16">
        <div className="my-24 w-full max-w-5xl">
          <div className="mb-10">
            <h2 className="mb-4 text-center text-3xl font-semibold text-neutral-900 md:text-start">
              Most asked FAQ&apos;s
            </h2>
            <p className="mx-auto max-w-[416px] text-center text-sm text-neutral-800 md:mx-0 md:text-start">
              We&apos;re here to help you and solve doubts. Find answers to the most common questions below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            {faqs.map((faq, index) => (
              <div
                key={faq.question}
                onClick={() => toggleFAQ(index)}
                className={`cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-3.5 transition-all duration-300 hover:bg-slate-100 ${
                  openIndex === index ? "row-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-neutral-800">{faq.question}</span>
                  <div
                    className={`rounded p-1 text-slate-400 transition-colors ${
                      openIndex === index ? "bg-slate-200 text-slate-500" : "hover:bg-slate-300 hover:text-slate-500"
                    }`}
                  >
                    {openIndex === index ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                    )}
                  </div>
                </div>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    openIndex === index ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-sm leading-relaxed text-neutral-600">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Faqs;
