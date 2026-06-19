import { motion } from "framer-motion";
import { Users, MapPin, TrendingUp, Shield } from "lucide-react";

const stats = [
  { icon: Users, value: "10,000+", label: "Happy Customers", suffix: "" },
  { icon: MapPin, value: "50+", label: "Cities Covered", suffix: "" },
  { icon: TrendingUp, value: "₹50Cr+", label: "Loans Disbursed", suffix: "" },
  { icon: Shield, value: "99.9%", label: "Customer Satisfaction", suffix: "" },
];

const StatsSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
