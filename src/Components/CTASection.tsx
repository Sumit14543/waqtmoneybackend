import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Link } from "react-router-dom";
import coinsStack from "../../assets/coins-stack.png";
const CTASection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-hero-gradient rounded-3xl p-8 md:p-14 flex flex-col md:flex-row items-center gap-10"
        >
          <div className="flex-1">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              When you need money, open the box
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-md">
              Apply in minutes and get access to transparent, flexible loan solutions designed to support your financial goals without unnecessary delays.
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8">
              <Link to="/user/apply">
                Apply For Loan <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="flex-shrink-0">
            <img src={coinsStack} alt="Gold coins" loading="lazy" width={250} height={250} className="animate-float" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
