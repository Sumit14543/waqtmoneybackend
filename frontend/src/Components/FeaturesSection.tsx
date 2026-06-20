import { motion } from "framer-motion";
import { Zap, Smartphone, Clock } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Fast and Easy Process",
    description: "With intuitive, user-friendly digital experience and a few easy steps.",
  },
  {
    icon: Smartphone,
    title: "100% Digital Process",
    description: "No paperwork, everything from application to disbursement is online.",
  },
  {
    icon: Clock,
    title: "Quick Loan Disbursement",
    description: "Get funds directly to your account within 24 hours of approval.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Why Choose <span className="text-gradient">Waqt Money?</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">Simple, transparent, and designed to work for you.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-card rounded-2xl p-8 text-center shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="w-14 h-14 rounded-xl bg-hero-gradient flex items-center justify-center mx-auto mb-5">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
