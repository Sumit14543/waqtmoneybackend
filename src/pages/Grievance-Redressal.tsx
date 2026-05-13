import React from "react";

const GrievanceRedressal = () => {
  return (
    <main className="min-h-screen bg-[#eaf3fb] px-4 py-10">
      <section className="max-w-5xl mx-auto">

        {/* TITLE */}
        <div className="text-center mb-8">
          <h1 className="text-xl md:text-2xl font-bold uppercase text-black">
            Grievance <span className=" text-primary -600">Redressal</span>
          </h1>
          <div className="w-20 h-[3px] bg-sky-500 mx-auto mt-3 rounded-full" />
        </div>

        {/* CARD */}
        <div className="bg-[#dcebf7] rounded-2xl shadow-[0_10px_35px_rgba(30,64,175,0.12)] px-6 md:px-10 py-8 md:py-10 text-[15px] leading-7 text-black">

          {/* INTRO */}
          <p className="mb-5">
            At <strong>Waqt Money</strong>, we are committed to providing a seamless 
            and transparent experience for our users. If you have any concerns, 
            complaints, or grievances related to our payday loan services, we 
            encourage you to reach out to us through the channels mentioned below.
          </p>

          <p className="mb-6">
            Our grievance redressal mechanism is designed to ensure quick 
            resolution, fairness, and transparency in handling user complaints.
          </p>

          {/* LEVEL 1 */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            1. Level 1 – Customer Support
          </h2>

          <p className="mb-4">
            You may contact our customer support team for any queries or issues 
            related to loan application, repayment, or account-related concerns.
          </p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Email:</strong> support@waqtmoney.com</li>
            <li><strong>Working Hours:</strong> 9:00 AM to 6:00 PM (Mon–Sat)</li>
            <li>Response Time: Within 24–48 business hours</li>
          </ul>

          {/* LEVEL 2 */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            2. Level 2 – Grievance Officer
          </h2>

          <p className="mb-4">
            If your issue is not resolved at Level 1, you may escalate the matter 
            to our Grievance Officer.
          </p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Name:</strong> Grievance Officer – Waqt Money</li>
            <li><strong>Email:</strong> grievance@waqtmoney.com</li>
            <li>Resolution Time: Within 7 working days</li>
          </ul>

          {/* LEVEL 3 */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            3. Level 3 – Escalation to Regulatory Authority
          </h2>

          <p className="mb-6">
            If your grievance is still not resolved satisfactorily, you may 
            approach the appropriate regulatory authority or partner NBFC 
            associated with your loan, as per applicable guidelines.
          </p>

          {/* TYPES */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            4. Types of Grievances
          </h2>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Loan application or rejection issues</li>
            <li>Delay in loan disbursal</li>
            <li>Repayment or EMI related concerns</li>
            <li>Incorrect charges or penalties</li>
            <li>Data privacy or misuse concerns</li>
          </ul>

          {/* TRACKING */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            5. Complaint Tracking
          </h2>

          <p className="mb-6">
            Once a complaint is registered, you will receive a reference ID 
            for tracking your grievance. Please use this ID for all future 
            communications related to your complaint.
          </p>

          {/* FAIR PRACTICE */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            6. Fair Practice Commitment
          </h2>

          <p className="mb-6">
            Waqt Money follows fair practices and ensures that all complaints 
            are handled with transparency, confidentiality, and in compliance 
            with applicable financial regulations.
          </p>

          {/* FINAL */}
          <h2 className="text-lg font-semibold  text-primary -600 mb-3">
            7. Contact Summary
          </h2>

          <p>
            <strong>Customer Support:</strong> support@waqtmoney.com <br />
            <strong>Grievance Officer:</strong> support@waqtfinance.com
          </p>

        </div>
      </section>
    </main>
  );
};

export default GrievanceRedressal;