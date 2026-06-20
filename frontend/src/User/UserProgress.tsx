import { Check } from "lucide-react";

const steps = [
  "Basic Details",
  "PAN Verify",
  "Aadhaar Verify",
  "Work Details",
  "Bank Details",
  "References",
  "Upload Docs",
  "Video KYC",
];

type UserProgressProps = {
  activeStep: number;
};

const UserProgress = ({ activeStep }: UserProgressProps) => {
  const activeLabel = steps[activeStep - 1] || steps[0];
  const progress = Math.min(Math.max((activeStep / steps.length) * 100, 0), 100);

  return (
    <>
      <div className="mx-auto mb-6 w-full max-w-[520px] rounded-2xl border border-[#dfe7f2] bg-white p-4 shadow-[0_10px_30px_rgba(32,56,85,0.08)] md:hidden">
        <div className="flex items-center justify-between gap-3 text-left">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#8048e2]">
              Step {activeStep} of {steps.length}
            </p>
            <p className="mt-1 text-sm font-extrabold text-[#071d3a]">{activeLabel}</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8048e2] text-sm font-bold text-white">
            {activeStep}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf2f7]">
          <div className="h-full rounded-full bg-[#8048e2]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mx-auto mb-8 hidden w-full max-w-[900px] items-start md:flex">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === activeStep;
          const isComplete = stepNumber < activeStep;

          return (
            <div key={step} className="relative flex flex-1 flex-col items-center">
              {index > 0 && (
              <span
                className={`absolute right-1/2 top-[17px] h-px w-full ${
                  isComplete || isActive ? "bg-[#8048e2]" : "bg-[#d8e1ee]"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                isActive
                  ? "border-[#d8c5ff] bg-[#8048e2] text-white shadow-[0_0_0_5px_rgba(128,72,226,0.12)]"
                  : isComplete
                    ? "border-[#8048e2] bg-[#f3eaff] text-[#8048e2]"
                    : "border-[#d8e1ee] bg-white text-[#718096]"
              }`}
            >
              {isComplete ? <Check className="h-4 w-4" strokeWidth={3} /> : stepNumber}
            </span>
            <span className="mt-2 max-w-[76px] text-center text-[10px] font-semibold uppercase leading-3 text-[#31435d]">
              {step}
            </span>
          </div>
          );
        })}
      </div>
    </>
  );
};

export default UserProgress;
