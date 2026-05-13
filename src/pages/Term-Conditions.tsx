import React from "react";

const TermsConditions = () => {
  return (
    <main className="min-h-screen bg-[#eaf3fb] px-4 py-10">
      <section className="max-w-5xl mx-auto">

        {/* TITLE */}
        <div className="text-center mb-8">
          <h1 className="text-xl md:text-2xl font-bold uppercase text-black">
            Terms & <span className=" text-primary -600">Conditions</span>
          </h1>
          <div className="w-20 h-[3px] bg-sky-500 mx-auto mt-3 rounded-full" />
        </div>

        {/* CARD */}
        <div className="bg-[#dcebf7] rounded-2xl shadow-[0_10px_35px_rgba(30,64,175,0.12)] px-6 md:px-10 py-8 md:py-10 text-[15px] leading-7 text-black">

          {/* INTRO */}
          <p className="mb-5">
            Welcome to <strong>Waqt Money</strong>, a digital platform providing fast and 
            secure payday loan services. By accessing or using our website, mobile 
            application, or services, you agree to comply with and be bound by these 
            Terms & Conditions.
          </p>

          <p className="mb-6">
            Please read these terms carefully before using our services. If you do not 
            agree with any part of these terms, you should not use our platform.
          </p>

          {/* ELIGIBILITY */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            1. Eligibility
          </h2>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>You must be at least 18 years old</li>
            <li>You must be an Indian resident</li>
            <li>You must provide accurate and complete information</li>
            <li>You must have a valid bank account and mobile number</li>
          </ul>

          {/* SERVICES */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            2. Services Offered
          </h2>

          <p className="mb-6">
            Waqt Money provides instant payday loan services through its digital platform. 
            Loan approval, amount, tenure, and interest rates are subject to eligibility 
            and verification checks.
          </p>

          {/* USER RESPONSIBILITY */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            3. User Responsibilities
          </h2>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Provide true and accurate information during application</li>
            <li>Maintain confidentiality of login and OTP details</li>
            <li>Use the platform only for lawful purposes</li>
            <li>Repay loan amounts on time as per agreement</li>
          </ul>

          {/* LOAN TERMS */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            4. Loan Terms & Repayment
          </h2>

          <p className="mb-4">
            All loans provided through Waqt Money are subject to approval and governed 
            by agreed terms including interest rate, tenure, and repayment schedule.
          </p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Late payments may attract penalties or additional charges</li>
            <li>Failure to repay may affect your credit score</li>
            <li>Recovery actions may be initiated as per applicable laws</li>
          </ul>

          {/* FEES */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            5. Fees & Charges
          </h2>

          <p className="mb-6">
            Waqt Money may charge processing fees, interest, or service charges 
            depending on the loan product. All applicable charges will be clearly 
            communicated before loan acceptance.
          </p>

          {/* PRIVACY */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            6. Privacy & Data Usage
          </h2>

          <p className="mb-6">
            Your personal data will be collected and used as per our Privacy Policy. 
            By using our services, you consent to such data collection and processing.
          </p>

          {/* THIRD PARTY */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            7. Third-Party Services
          </h2>

          <p className="mb-6">
            We may engage third-party partners such as NBFCs, payment gateways, 
            and KYC providers to deliver services. We are not responsible for 
            their independent actions.
          </p>

          {/* LIMITATION */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            8. Limitation of Liability
          </h2>

          <p className="mb-6">
            Waqt Money shall not be liable for any indirect, incidental, or 
            consequential damages arising from the use of our platform or services.
          </p>

          {/* TERMINATION */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            9. Termination
          </h2>

          <p className="mb-6">
            We reserve the right to suspend or terminate your access if you violate 
            these terms or engage in fraudulent or unlawful activities.
          </p>

          {/* CHANGES */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            10. Changes to Terms
          </h2>

          <p className="mb-6">
            Waqt Money may update these Terms & Conditions at any time. Continued use 
            of the platform indicates your acceptance of the updated terms.
          </p>

          {/* CONTACT */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            11. Contact Us
          </h2>

          <p>
            For any queries regarding these Terms & Conditions:
            <br />
            <strong>Email:</strong> support@waqtmoney.com
          </p>

        </div>
      </section>
    </main>
  );
};

export default TermsConditions;