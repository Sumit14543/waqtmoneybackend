import React from "react";

const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-[#eaf3fb] px-4 py-10">
      <section className="max-w-5xl mx-auto">

        {/* TITLE */}
        <div className="text-center mb-8">
          <h1 className="text-xl md:text-2xl font-bold uppercase text-black">
            Privacy <span className="text-primary">Policy</span>
          </h1>
          <div className="w-20 h-[3px] bg-sky-500 mx-auto mt-3 rounded-full" />
        </div>

        {/* CARD */}
        <div className="bg-[#dcebf7] rounded-2xl shadow-[0_10px_35px_rgba(30,64,175,0.12)] px-6 md:px-10 py-8 md:py-10 text-[15px] leading-7 text-black">

          {/* INTRO */}
          <p className="mb-5">
            Welcome to <strong>Waqt Money</strong>, a digital platform providing fast and secure 
            payday loan solutions in India. We are committed to protecting your privacy and 
            ensuring that your personal and financial information is handled safely and responsibly.
          </p>

          <p className="mb-5">
            This Privacy Policy explains how we collect, use, process, and protect your information 
            when you use our website, mobile application, or services. By accessing or using 
            Waqt Money services, you agree to the terms outlined in this policy.
          </p>

          {/* DEFINITIONS */}
          <h2 className="text-lg font-semibold text-primary">Definition</h2>

          <div className="space-y-3 text-black mb-6">
            <p><strong>"Company"</strong> refers to Waqt Money, offering instant payday loan services.</p>
            <p><strong>"User"</strong> refers to any individual applying for or using our services.</p>
            <p><strong>"Personal Information"</strong> means any data that identifies you personally.</p>
            <p><strong>"Services"</strong> include loan application, approval, disbursal, and support.</p>
            <p><strong>"Third Parties"</strong> means partners, lenders, or service providers working with us.</p>
          </div>

          {/* INFO COLLECTION */}
          <h2 className="text-lg font-semibold text-primary mb-3">
            1. Information We Collect
          </h2>

          <p className="mb-4">
            To provide instant payday loan services, we collect necessary information during your 
            application and usage of our platform. This may include:
          </p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Personal details (Name, DOB, Gender)</li>
            <li>Contact details (Mobile number, Email address)</li>
            <li>Financial details (Salary, Bank account, Income source)</li>
            <li>Employment details (Company name, Job role)</li>
            <li>Device and technical data (IP address, device type)</li>
          </ul>

          {/* USAGE */}
          <h2 className="text-lg font-semibold text-primary mb-3">
            2. How We Use Your Information
          </h2>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>To verify your identity and eligibility for loans</li>
            <li>To process and approve your payday loan application</li>
            <li>To disburse funds quickly and securely</li>
            <li>To improve user experience and platform performance</li>
            <li>To communicate important updates and offers</li>
          </ul>

          {/* SHARING */}
          <h2 className="text-lg font-semibold text-primary-600 mb-3">
            3. Sharing of Information
          </h2>

          <p className="mb-4">
            We may share your information with trusted third parties only when necessary:
          </p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Partner NBFCs / lenders for loan processing</li>
            <li>KYC verification agencies</li>
            <li>Payment gateways and banking partners</li>
            <li>Legal or regulatory authorities if required</li>
          </ul>

          {/* SECURITY */}
          <h2 className="text-lg font-semibold text-primary mb-3">
            4. Data Security
          </h2>

          <p className="mb-6">
            We use industry-standard security measures including encryption, firewalls, and secure 
            servers to protect your data from unauthorized access, misuse, or disclosure.
          </p>

          {/* COOKIES */}
          <h2 className="text-lg font-semibold text-primary mb-3">
            5. Cookies & Tracking
          </h2>

          <p className="mb-6">
            We use cookies and similar technologies to enhance your browsing experience, analyze 
            traffic, and personalize content. You can control cookies through your browser settings.
          </p>

          {/* USER RIGHTS */}
          <h2 className="text-lg font-semibold text-primary mb-3">
            6. Your Rights
          </h2>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Access and review your personal data</li>
            <li>Request correction or deletion</li>
            <li>Withdraw consent anytime</li>
            <li>Opt-out of marketing communications</li>
          </ul>

          {/* RETENTION */}
          <h2 className="text-lg font-semibold text-primary mb-3">
            7. Data Retention
          </h2>

          <p className="mb-6">
            We retain your data only as long as necessary to fulfill legal, regulatory, and business 
            requirements related to payday loan services.
          </p>

          {/* UPDATE */}
          <h2 className="text-lg font-semibold text-primary mb-3">
            8. Policy Updates
          </h2>

          <p className="mb-6">
            Waqt Money reserves the right to update this Privacy Policy at any time. Changes will be 
            reflected on this page and continued usage means acceptance of updates.
          </p>

          {/* CONTACT */}
          <h2 className="text-lg font-semibold text-primary mb-3">
            9. Contact Us
          </h2>

          <p>
            If you have any questions regarding this Privacy Policy, please contact us at:
            <br />
            <strong>Email:</strong> support@waqtmoney.com
          </p>

        </div>
      </section>
    </main>
  );
};

export default PrivacyPolicy;