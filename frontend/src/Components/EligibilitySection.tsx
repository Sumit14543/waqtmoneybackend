import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const eligible = [
  "Indian citizen aged 21–58 years",
  "Salaried or self-employed individual",
  "Minimum monthly income of ₹15,000",
  "Valid PAN & Aadhaar card",
  "Active bank account with 3+ months history",
];

const documents = [
  "PAN Card",
  "Aadhaar Card (front & back)",
  "Latest 3 months salary slips",
  "Bank statements (last 6 months)",
  "Passport-size photograph",
];

const EligibilitySection = () => {
  return (
    <section id="eligibility" className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block bg-accent/10 text-accent text-xs font-semibold px-3 py-1 rounded-full mb-4">Eligibility</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Who Can <span className="text-gradient">Apply?</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Check if you meet the basic requirements and keep your documents ready for a smooth application.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8 shadow-card"
          >
            <h3 className="font-display text-lg font-bold mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              Eligibility Criteria
            </h3>
            <ul className="space-y-3">
              {eligible.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8 shadow-card"
          >
            <h3 className="font-display text-lg font-bold mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Documents Required
            </h3>
            <ul className="space-y-3">
              {documents.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-accent" />
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default EligibilitySection;
