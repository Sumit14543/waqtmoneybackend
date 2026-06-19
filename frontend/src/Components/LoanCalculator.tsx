import { useState, useMemo } from "react";
import { Slider } from "@/Components/ui/slider";
import { Button } from "@/Components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";

const LoanCalculator = () => {
  const [amount, setAmount] = useState(20000);
  const [tenure, setTenure] = useState(30);

  const dailyRate = 1;

  const { totalPayable, totalInterest, apr, chartData } = useMemo(() => {
    const interest = amount * (dailyRate / 100) * tenure;
    const total = amount + interest;
    const aprVal = (dailyRate * 365).toFixed(1);

    return {
      totalPayable: Math.round(total),
      totalInterest: Math.round(interest),
      apr: aprVal,
      chartData: [
        { name: "Principal", value: amount },
        { name: "Interest", value: Math.round(interest) },
      ],
    };
  }, [amount, tenure]);

  const COLORS = ["#7c3aed", "#c4b5fd"];

  const features = [
    "Loan Amount: ₹5,000 to ₹1,00,000",
    "Tenure: 7 to 45 Days",
    "Daily Interest Rate: 1%",
    "No Pre-closure Charges",
    "No Foreclosure Charges",
    "No Hidden Charges",
    "Min Monthly Salary > ₹15,000",
  ];

  return (
    <section
      id="calculator"
      className="py-10 lg:py-28 bg-[linear-gradient(135deg,#ede9fe,#ffffff)]"
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold">
            Smart <span className="text-purple-600">Loan Calculator</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Plan your finances with our smart loan planner. Transparent and easy to understand.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">

          {/* LEFT SIDE */}
          <div className="bg-white rounded-2xl shadow-lg p-9 lg:p-8 space-y-8">

            {/* AMOUNT */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">
                  Estimated Amount Required
                </label>
                <span className="text-sm font-semibold text-purple-600">
                  ₹{amount.toLocaleString()}
                </span>
              </div>
              <Slider
                value={[amount]}
                onValueChange={(v) => setAmount(v[0])}
                min={5000}
                max={100000}
                step={1000}
              />
            </div>

            {/* TENURE */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">
                  Loan Term (Days)
                </label>
                <span className="text-sm font-semibold text-purple-600">
                  {tenure} Days
                </span>
              </div>
              <Slider
                value={[tenure]}
                onValueChange={(v) => setTenure(v[0])}
                min={7}
                max={45}
                step={1}
              />
            </div>

            {/* RATE */}
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">
                  Daily Interest Rate
                </label>
                <span className="text-sm font-bold text-purple-600">
                  1% / day
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Fixed daily rate applied on principal amount
              </p>
            </div>

            {/* PIE CHART BELOW RATE */}
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-3 text-xs font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
                  Principal
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-purple-300 rounded-full"></span>
                  Interest
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8">
              <h3 className="font-semibold text-lg mb-4">Loan Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Loan Amount</span>
                  <span>₹{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tenure</span>
                  <span>{tenure} Days</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Interest</span>
                  <span>₹{totalInterest.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-gray-500">Total Payable</p>
                <p className="text-3xl font-bold">
                  ₹{totalPayable.toLocaleString()}
                </p>
              </div>

              <Button asChild className="w-full mt-4 bg-purple-600 text-white rounded-xl font-semibold hover:opacity-90">
                <Link to="/user/apply">
                  Get Started{" "}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h4 className="font-semibold text-sm mb-3">Rate & Charges</h4>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default LoanCalculator;
