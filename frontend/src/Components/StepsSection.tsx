import { motion } from "framer-motion";
import { FileText, UserCheck, FolderOpen, IndianRupee } from "lucide-react";

const steps = [
  { icon: FileText, label: "Apply Now", desc: "Fill a quick online application. Simple details, hassle-free." },
  { icon: UserCheck, label: "Eligibility Check", desc: "We quickly verify your eligibility and get back to you instantly." },
  { icon: FolderOpen, label: "Document Collection", desc: "No physical paperwork. Upload documents securely online." },
  { icon: IndianRupee, label: "Quick Disbursement", desc: "Once approved, funds are swiftly transferred to your account." },
];

const StepsSection = () => {
  return (
    <section id="our-process" className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Get Started in Just a <span className="text-gradient">Few Steps</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            A quick, transparent, and hassle-free process designed to get you funds when you need them most.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative bg-card rounded-2xl p-6 shadow-card text-center"
            >
              <span className="absolute -top-3 left-6 bg-hero-gradient text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                STEP {i + 1}
              </span>
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mt-4 mb-4">
                <s.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-display font-semibold mb-2">{s.label}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepsSection;
