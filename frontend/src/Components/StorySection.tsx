import { motion } from "framer-motion";
import { Check } from "lucide-react";

const promises = [
  "Responsible and ethical lending",
  "Complete transparency",
  "Long-term customer relationships",
  "Data Privacy and Security",
];

const StorySection = () => {
  return (
    <section id="our-story" className="py-20">
      <div className="container mx-auto px-4">
        <div className="bg-hero-gradient rounded-3xl p-8 md:p-14 grid md:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block bg-primary-foreground/20 text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">Our Story</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Empowering dreams, Strengthening bonds.
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              Waqt Money is a customer-centric company committed to making credit simple, fast and transparent.
              Our goal is to support individuals' financial freedom by providing easy access to funds when they need it most.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8"
          >
            <h3 className="font-display text-xl font-bold mb-5">Our Promises</h3>
            <ul className="space-y-4">
              {promises.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{p}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StorySection;
