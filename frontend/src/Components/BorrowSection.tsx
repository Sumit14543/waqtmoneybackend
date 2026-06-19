import { Zap, Layers, PartyPopper } from "lucide-react";

const loanTypes = [
  {
    icon: Zap,
    title: "Instant Cash",
    desc: "For urgent expenses and short-term needs. Get funds in your account within hours.",
    color: "bg-primary text-primary-foreground",
  },
  {
    icon: Layers,
    title: "Debt Consolidation",
    desc: "Combine multiple EMIs into one simple repayment. Lower your overall interest burden.",
    color: "bg-foreground text-background",
  },
  {
    icon: PartyPopper,
    title: "Celebration Loans",
    desc: "For weddings, travel, and life moments. Celebrate without financial stress.",
    color: "bg-primary text-primary-foreground",
  },
];

const BorrowSection = () => (
  <section className="py-20 lg:py-28">
    <div className="container mx-auto px-4 lg:px-8">
      <div className="text-center mb-14">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
          Borrow <span className="text-gradient-primary">for What Matters</span>
        </h2>
        <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
          Smart borrowing starts here. Trusted by thousands across India.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
        <div className="space-y-5">
          {loanTypes.map((loan, i) => (
            <div
              key={loan.title}
              className={`${loan.color} rounded-2xl p-5 shadow-card animate-fade-up`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="flex items-start gap-3">
                <loan.icon className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-heading font-bold text-lg">{loan.title}</h3>
                  <p className="text-sm opacity-90 mt-1">{loan.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden lg:block">
          <img
            src="/borrow-lifestyle.jpg"
            alt="Person managing finances"
            loading="lazy"
            width={640}
            height={512}
            className="rounded-3xl shadow-elevated w-full object-cover"
          />
        </div>
      </div>
    </div>
  </section>
);

export default BorrowSection;
