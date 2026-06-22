const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizePan = (value) => String(value || "").trim().toUpperCase();

export const hasApplicationContactProof = ({ mobile, email, pan } = {}) =>
  Boolean(normalizeMobile(mobile) || normalizeEmail(email) || normalizePan(pan));

export const applicationContactMatches = (application, { mobile, email, pan } = {}) => {
  if (!application) return false;

  const requestMobile = normalizeMobile(mobile);
  const requestEmail = normalizeEmail(email);
  const requestPan = normalizePan(pan);

  return Boolean(
    (requestMobile && requestMobile === normalizeMobile(application.mobile)) ||
    (requestEmail && requestEmail === normalizeEmail(application.email)) ||
    (requestPan && requestPan === normalizePan(application.pan_number)),
  );
};