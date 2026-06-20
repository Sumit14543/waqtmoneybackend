import { motion } from "framer-motion";
import { ShieldCheck, Lock, Award, Building2 } from "lucide-react";

const badges = [
  { icon: Building2, label: "RBI Registered NBFC" },
  { icon: ShieldCheck, label: "ISO 27001 Certified" },
  { icon: Lock, label: "256-bit SSL Encryption" },
  { icon: Award, label: "Industry Compliant" },
];

const TrustSection = () => {
  return (
    <section className="py-14 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trusted & Secure</p>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
          {badges.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <b.icon className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">{b.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
