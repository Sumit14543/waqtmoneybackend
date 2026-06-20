import React from "react";

// Common Navbar Skeleton
export const PageNavbarSkeleton = () => (
  <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
    <div className="flex h-16 items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* Logo skeleton */}
        <div className="skeleton-block h-10 w-36 rounded-xl shadow-sm ring-1 ring-purple-100/70 sm:w-44" />
      </div>
      <div className="hidden items-center gap-6 md:flex">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="skeleton-block h-3.5 w-16 rounded-full" />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden h-9 w-16 rounded-full sm:block skeleton-block" />
        <div className="skeleton-block h-10 w-24 rounded-full bg-purple-200" />
      </div>
    </div>
  </div>
);

// Common Footer Skeleton
export const PageFooterSkeleton = () => (
  <div className="mx-auto max-w-7xl border-t border-purple-100/70 px-6 py-12 lg:px-8 mt-12">
    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="space-y-4">
          <div className="skeleton-block h-4 w-24 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton-block h-3 w-full rounded-full" />
            <div className="skeleton-block h-3 w-[80%] rounded-full" />
            <div className="skeleton-block h-3 w-[60%] rounded-full" />
          </div>
        </div>
      ))}
    </div>
    <div className="mt-8 border-t border-purple-100/50 pt-8 flex items-center justify-between">
      <div className="skeleton-block h-4 w-48 rounded-full" />
      <div className="flex gap-4">
        <div className="skeleton-block h-4 w-20 rounded-full" />
        <div className="skeleton-block h-4 w-20 rounded-full" />
      </div>
    </div>
  </div>
);

// Fallback for Home Page (Index) - The original homepage structure
export const HomeFallback = () => (
  <div className="page-loader-screen min-h-screen bg-[linear-gradient(180deg,#f7f3ff_0%,#fbfaff_45%,#fffaf3_100%)]">
    <PageNavbarSkeleton />
    
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <section className="grid items-center gap-8 pb-10 pt-7 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:pb-12 lg:pt-12">
        <div className="text-center lg:text-left">
          <div className="mx-auto h-8 w-44 rounded-full lg:mx-0 skeleton-block" />
          <div className="mx-auto mt-6 max-w-2xl lg:mx-0">
            <div className="skeleton-block mx-auto h-12 w-[92%] rounded-full lg:mx-0" />
            <div className="skeleton-block mx-auto mt-4 h-12 w-[76%] rounded-full lg:mx-0" />
            <div className="skeleton-block mx-auto mt-4 h-12 w-[58%] rounded-full lg:mx-0" />
          </div>
          <div className="mx-auto mt-7 max-w-xl lg:mx-0">
            <div className="skeleton-block h-4 w-full rounded-full" />
            <div className="skeleton-block mt-3 h-4 w-[78%] rounded-full" />
          </div>

          <div className="mx-auto mt-8 flex w-full max-w-md items-center gap-2 rounded-full border border-purple-100 bg-white p-2 shadow-md lg:mx-0">
            <div className="skeleton-block h-11 flex-1 rounded-full" />
            <div className="skeleton-block h-11 w-32 rounded-full bg-purple-200" />
          </div>

          <div className="mx-auto mt-8 grid max-w-xl gap-5 sm:grid-cols-2 lg:mx-0">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="skeleton-block h-11 w-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="skeleton-block h-4 w-[80%] rounded-full" />
                  <div className="skeleton-block mt-2 h-3 w-[58%] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px]">
          <div className="absolute -inset-4 rounded-[36px] bg-purple-100/60 blur-3xl" />
          <div className="relative rounded-[32px] bg-white/80 p-3 shadow-[0_28px_90px_rgba(91,33,182,0.16)]">
            <div className="skeleton-block aspect-[5/4] w-full rounded-[28px]" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-t border-purple-100/70 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="skeleton-block h-10 w-10 rounded-xl" />
            <div className="skeleton-block mt-5 h-5 w-32 rounded-full" />
            <div className="skeleton-block mt-3 h-3 w-full rounded-full" />
          </div>
        ))}
      </section>
    </div>
    
    <PageFooterSkeleton />
  </div>
);

// Fallback for Content/Marketing Pages (About-us, Services, FAQs, Policies, Repayment, Emi-Calculator, etc.)
export const ContentPageFallback = () => (
  <div className="page-loader-screen min-h-screen bg-[linear-gradient(180deg,#fcfaff_0%,#ffffff_100%)]">
    <PageNavbarSkeleton />
    
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Title Header area */}
      <div className="mx-auto max-w-3xl text-center mb-16">
        <div className="mx-auto skeleton-block h-6 w-28 rounded-full mb-4" />
        <div className="mx-auto skeleton-block h-10 w-[70%] rounded-full mb-3" />
        <div className="mx-auto skeleton-block h-4 w-[85%] rounded-full" />
      </div>

      {/* Grid Content skeleton */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="rounded-2xl border border-purple-50 bg-white p-6 shadow-sm">
            <div className="skeleton-block h-12 w-12 rounded-xl mb-4" />
            <div className="skeleton-block h-5 w-40 rounded-full mb-2" />
            <div className="skeleton-block h-3.5 w-full rounded-full mb-1.5" />
            <div className="skeleton-block h-3.5 w-[85%] rounded-full" />
          </div>
        ))}
      </div>

      {/* Interactive element area (like calculator/CTA area placeholder) */}
      <div className="mt-16 rounded-2xl border border-purple-100 bg-purple-50/40 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="skeleton-block h-6 w-48 rounded-full" />
          <div className="skeleton-block h-4 w-[75%] rounded-full" />
        </div>
        <div className="skeleton-block h-12 w-40 rounded-full bg-purple-300 shrink-0" />
      </div>
    </div>

    <PageFooterSkeleton />
  </div>
);

// Fallback for Auth Pages (Login, MobileOtp)
export const AuthPageFallback = () => (
  <div className="page-loader-screen min-h-screen bg-[linear-gradient(180deg,#fcfaff_0%,#ffffff_100%)] flex flex-col justify-between">
    <PageNavbarSkeleton />
    
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[480px] rounded-3xl border border-purple-100 bg-white p-8 shadow-[0_24px_80px_rgba(91,33,182,0.08)]">
        {/* Form header */}
        <div className="text-center mb-8">
          <div className="mx-auto skeleton-block h-12 w-12 rounded-2xl mb-4 bg-purple-100" />
          <div className="mx-auto skeleton-block h-6 w-44 rounded-full mb-2" />
          <div className="mx-auto skeleton-block h-4 w-64 rounded-full" />
        </div>

        {/* Inputs */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="skeleton-block h-4 w-28 rounded-full" />
            <div className="skeleton-block h-[52px] w-full rounded-lg" />
          </div>
          <div className="skeleton-block h-[52px] w-full rounded-lg bg-purple-300" />
        </div>

        {/* Info Text */}
        <div className="mt-6 space-y-2">
          <div className="skeleton-block h-3 w-full rounded-full" />
          <div className="skeleton-block h-3 w-[70%] rounded-full mx-auto" />
        </div>
      </div>
    </div>

    <PageFooterSkeleton />
  </div>
);

// Fallback for KYC/User Flow Pages (Apply, KYC details, Documents, Video KYC, Status, etc.)
export const KycPageFallback = () => (
  <div className="page-loader-screen min-h-screen bg-[linear-gradient(180deg,#f7f9fc_0%,#ffffff_100%)]">
    <PageNavbarSkeleton />

    <div className="mx-auto max-w-[900px] px-4 py-8">
      {/* Mobile/Desktop Progress Bar Skeleton */}
      <div className="mx-auto mb-8 w-full max-w-[900px] rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="skeleton-block h-4 w-24 rounded-full" />
            <div className="skeleton-block h-4 w-32 rounded-full" />
          </div>
          <div className="skeleton-block h-8 w-8 rounded-full shrink-0" />
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className="skeleton-block h-full w-[45%] rounded-full" />
        </div>
      </div>

      {/* Central Form Card */}
      <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-[0_20px_60px_rgba(91,33,182,0.06)] md:p-8">
        <div className="flex flex-col gap-6">
          {/* Header info */}
          <div className="border-b border-purple-100/60 pb-5">
            <div className="skeleton-block h-6 w-56 rounded-full mb-2" />
            <div className="skeleton-block h-4 w-80 rounded-full" />
          </div>

          {/* Form fields skeleton grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="space-y-2">
                <div className="skeleton-block h-4 w-28 rounded-full" />
                <div className="skeleton-block h-[50px] w-full rounded-lg" />
              </div>
            ))}
          </div>

          {/* Footer buttons */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="skeleton-block h-12 w-28 rounded-lg" />
            <div className="skeleton-block h-12 w-36 rounded-lg bg-purple-300" />
          </div>
        </div>
      </div>
    </div>

    <PageFooterSkeleton />
  </div>
);

// Fallback for Loan Dashboard page
export const DashboardPageFallback = () => (
  <div className="page-loader-screen min-h-screen bg-[#f8fafc]">
    {/* Dashboard Top bar */}
    <div className="border-b border-purple-100/80 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <div className="skeleton-block h-8 w-36 rounded-lg" />
        <div className="flex items-center gap-3">
          <div className="skeleton-block h-5 w-24 rounded-full" />
          <div className="skeleton-block h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Welcome Banner Skeleton */}
      <div className="mb-8 rounded-3xl bg-slate-900 p-6 md:p-8">
        <div className="max-w-xl space-y-3">
          <div className="skeleton-block h-7 w-48 rounded-full bg-white/15" />
          <div className="skeleton-block h-4 w-72 rounded-full bg-white/10" />
          <div className="skeleton-block h-4 w-60 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        {/* Left column: Quick Actions / Tip of the day */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
            <div className="skeleton-block h-5 w-40 rounded-full mb-4" />
            <div className="space-y-3">
              <div className="skeleton-block h-4 w-full rounded-full" />
              <div className="skeleton-block h-4 w-[80%] rounded-full" />
            </div>
          </div>
          
          <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
            <div className="skeleton-block h-5 w-36 rounded-full mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton-block h-12 rounded-xl" />
              <div className="skeleton-block h-12 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Right column: Active Loan list */}
        <div className="space-y-6">
          {[1].map((item) => (
            <div key={item} className="overflow-hidden rounded-[30px] border border-purple-100 bg-white shadow-sm">
              <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="skeleton-block h-6 w-32 rounded-full" />
                  <div className="skeleton-block h-10 w-24 rounded-lg bg-purple-200" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((field) => (
                    <div key={field} className="space-y-2">
                      <div className="skeleton-block h-3.5 w-20 rounded-full" />
                      <div className="skeleton-block h-5 w-28 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
