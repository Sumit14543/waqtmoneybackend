import React from "react";

const FairPracticesCode = () => {
  return (
    <main className="min-h-screen bg-[#eaf3fb] px-4 py-10">
      <section className="max-w-5xl mx-auto">

        {/* TITLE */}
        <div className="text-center mb-8">
          <h1 className="text-xl md:text-2xl font-bold uppercase text-black">
            Fair Practices <span className=" text-primary -600">Code</span>
          </h1>
          <div className="w-20 h-[3px] bg-sky-500 mx-auto mt-3 rounded-full" />
        </div>

        {/* CARD */}
        <div className="bg-[#dcebf7] rounded-2xl shadow-[0_10px_35px_rgba(30,64,175,0.12)] px-6 md:px-10 py-8 md:py-10 text-[15px] leading-7 text-black">

          {/* INTRO */}
          <p className="mb-5">
            <strong>Waqt Money</strong> is committed to ensuring transparency, fairness, 
            and ethical practices while offering instant payday loan services. 
            This Fair Practices Code is based on applicable regulatory guidelines 
            and is followed in coordination with our partner NBFCs/lenders.
          </p>

          <p className="mb-6">
            The objective of this code is to provide clear and fair treatment 
            to customers throughout the loan lifecycle including application, 
            approval, disbursal, and repayment.
          </p>

          {/* APPLICATION */}
          <h2 className="text-lg font-semibold   text-primary  -600 mb-3">
            1. Loan Application Process
          </h2>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>All loan applications are processed digitally through a simple interface</li>
            <li>Applicants are required to provide accurate and complete information</li>
            <li>All required documents and KYC details will be clearly communicated</li>
          </ul>

          {/* TRANSPARENCY */}
          <h2 className="text-lg font-semibold   text-primary  -600 mb-3">
            2. Transparency in Loan Terms
          </h2>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Interest rates, fees, and charges are clearly disclosed upfront</li>
            <li>No hidden charges will be applied</li>
            <li>Loan agreement terms will be shared before acceptance</li>
          </ul>

          {/* DISBURSAL */}
          <h2 className="text-lg font-semibold   text-primary  -600 mb-3">
            3. Loan Disbursal
          </h2>

          <p className="mb-6">
            Approved loans are disbursed directly to the borrower’s bank account 
            in a timely manner after successful verification and acceptance of terms.
          </p>

          {/* REPAYMENT */}
          <h2 className="text-lg font-semibold   text-primary  -600 mb-3">
            4. Repayment & Collections
          </h2>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Clear repayment schedules will be provided</li>
            <li>No harassment or unfair practices in recovery</li>
            <li>Customers will be informed before applying any penalties</li>
          </ul>

          {/* DATA PRIVACY */}
          <h2 className="text-lg font-semibold   text-primary  -600 mb-3">
            5. Data Privacy & Confidentiality
          </h2>

          <p className="mb-6">
            Customer information is handled securely and used only for legitimate 
            business purposes such as loan processing, verification, and compliance.
          </p>

          {/* NON-DISCRIMINATION */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            6. Non-Discrimination
          </h2>

          <p className="mb-6">
            Waqt Money does not discriminate based on gender, religion, caste, 
            or any other personal factor while evaluating loan applications.
          </p>

          {/* GRIEVANCE */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            7. Grievance Redressal
          </h2>

          <p className="mb-6">
            Customers can raise complaints through our grievance redressal 
            mechanism. All complaints will be resolved within defined timelines 
            in a fair and transparent manner.
          </p>

          {/* COMPLIANCE */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            8. Regulatory Compliance
          </h2>

          <p className="mb-6">
            Waqt Money works in partnership with RBI-registered NBFCs/lenders and 
            ensures compliance with applicable laws, guidelines, and industry standards.
          </p>

          {/* FINAL */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            9. Contact Us
          </h2>

          <p>
            For any queries related to Fair Practices Code:
            <br />
            <strong>Email:</strong> support@waqtmoney.com
          </p>

        </div>
      </section>
    </main>
  );
};

export default FairPracticesCode;