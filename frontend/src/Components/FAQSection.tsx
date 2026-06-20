import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/Components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  { q: "How much loan amount can I get?", a: "You can get a personal loan ranging from ₹10,000 to ₹5,00,000 depending on your eligibility and credit profile." },
  { q: "Who is eligible to apply for a personal loan?", a: "Any salaried or self-employed individual between 21-58 years of age with a valid PAN and Aadhaar card can apply." },
  { q: "What is the loan tenure?", a: "Loan tenure ranges from 3 months to 36 months, giving you flexible repayment options." },
  { q: "What interest rate will be charged?", a: "Interest rates start from 12% per annum and vary based on your credit score and loan amount." },
  { q: "Are there any hidden charges?", a: "No, we believe in complete transparency. All charges are disclosed upfront before you accept the loan offer." },
];

const FAQSection = () => {
  return (
    <section id="faqs" className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">FAQs</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Questions? We've got <span className="text-gradient">answers</span>
          </h2>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl px-6 border-none shadow-card">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
