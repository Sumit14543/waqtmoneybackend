import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPANY_ADDRESS = "H-15 BSI Business Park, H Block, Sector 63, Noida, Uttar Pradesh, India";

const currency = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Rs. 0";

  return `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
};

const formatDate = (value = new Date()) => {
  const date = new Date(value);
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(validDate);
};

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");

const addText = (parts, text, x, y, size = 10, options = {}) => {
  const font = options.bold ? "F2" : "F1";
  const color = options.color || "0 0 0";
  parts.push(`BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
};

const addWrappedText = (parts, text, x, y, maxChars, lineHeight = 12, size = 9, options = {}) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  lines.forEach((value, index) => addText(parts, value, x, y - index * lineHeight, size, options));

  return y - Math.max(lines.length - 1, 0) * lineHeight;
};

const addLine = (parts, x1, y1, x2, y2, color = "0.82 0.82 0.88") => {
  parts.push(`${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);
};

const addStrokeRect = (parts, x, y, width, height, color = "0.88 0.87 0.93") => {
  parts.push(`${color} RG ${x} ${y} ${width} ${height} re S`);
};

const addRect = (parts, x, y, width, height, color, strokeColor = "") => {
  parts.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
  if (strokeColor) {
    parts.push(`${strokeColor} RG ${x} ${y} ${width} ${height} re S`);
  }
};

const addSectionTitle = (parts, title, x, y) => {
  addText(parts, title, x, y, 11.5, { bold: true, color: "0.23 0.11 0.57" });
  addLine(parts, x, y - 8, x + 484, y - 8, "0.86 0.82 0.94");
};

const addRow = (parts, label, value, x, y, width = 484) => {
  addRect(parts, x, y - 14, width, 25, "1 1 1", "0.90 0.88 0.94");
  addRect(parts, x, y - 14, 172, 25, "0.985 0.982 0.995");
  addText(parts, label, x + 12, y - 3, 8.5, { color: "0.36 0.40 0.50" });
  addWrappedText(parts, value, x + 188, y - 3, 46, 10, 9, {
    bold: true,
    color: "0.04 0.11 0.22",
  });
};

const addConditionList = (parts, items, x, y) => {
  let cursorY = y;

  items.forEach((item, index) => {
    const number = `${index + 1}.`;
    addText(parts, number, x, cursorY, 8.4, { bold: true, color: "0.18 0.22 0.30" });
    const endY = addWrappedText(parts, item, x + 18, cursorY, 92, 10.5, 8.4, {
      color: "0.18 0.22 0.30",
    });
    cursorY = endY - 13;
  });

  return cursorY;
};

const addImage = (parts, name, x, y, width, height) => {
  parts.push(`q ${width} 0 0 ${height} ${x} ${y} cm /${name} Do Q`);
};

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
};

const readPngLogo = () => {
  const candidates = [
    path.join(process.cwd(), "public", "waqt-money-logo-img.png"),
    path.join(process.cwd(), "..", "public", "waqt-money-logo-img.png"),
    path.join(__dirname, "..", "..", "..", "public", "waqt-money-logo-img.png"),
    path.join(process.cwd(), "public", "logo1.png"),
    path.join(process.cwd(), "..", "public", "logo1.png"),
    path.join(__dirname, "..", "..", "..", "public", "logo1.png"),
  ];
  const logoPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!logoPath) return null;

  const buffer = fs.readFileSync(logoPath);
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const interlace = buffer[28];
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) return null;

  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IDAT") chunks.push(data);
    if (type === "IEND") break;
    offset += length + 12;
  }

  const inflated = zlib.inflateSync(Buffer.concat(chunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const rgba = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = inflated.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    const previousRowOffset = (y - 1) * stride;
    const outputRowOffset = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? rgba[outputRowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? rgba[previousRowOffset + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? rgba[previousRowOffset + x - bytesPerPixel] : 0;
      let value = row[x];

      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (value + paeth(left, up, upLeft)) & 255;

      rgba[outputRowOffset + x] = value;
    }
  }

  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    const alpha = rgba[i + 3] / 255;
    rgb[j] = Math.round(rgba[i] * alpha + 255 * (1 - alpha));
    rgb[j + 1] = Math.round(rgba[i + 1] * alpha + 255 * (1 - alpha));
    rgb[j + 2] = Math.round(rgba[i + 2] * alpha + 255 * (1 - alpha));
  }

  return {
    width,
    height,
    data: zlib.deflateSync(rgb),
  };
};

const createObjectBuffer = (object) => {
  if (Buffer.isBuffer(object)) return object;
  return Buffer.from(String(object), "utf8");
};

const createImageObject = (image) => {
  if (!image) return null;

  return Buffer.concat([
    Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.data.length} >>\nstream\n`,
      "utf8"
    ),
    image.data,
    Buffer.from("\nendstream", "utf8"),
  ]);
};

const buildPdf = (content, logoImage = null) => {
  const hasLogo = Boolean(logoImage);
  const logoObjectNumber = hasLogo ? 6 : null;
  const contentObjectNumber = hasLogo ? 7 : 6;
  const resources = hasLogo
    ? `/Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Logo ${logoObjectNumber} 0 R >>`
    : "/Font << /F1 4 0 R /F2 5 0 R >>";

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << ${resources} >> /Contents ${contentObjectNumber} 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  if (hasLogo) objects.push(createImageObject(logoImage));
  objects.push(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);

  let pdf = Buffer.from("%PDF-1.4\n", "utf8");
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf = Buffer.concat([
      pdf,
      Buffer.from(`${index + 1} 0 obj\n`, "utf8"),
      createObjectBuffer(object),
      Buffer.from("\nendobj\n", "utf8"),
    ]);
  });

  const xrefOffset = pdf.length;
  let trailer = `xref\n0 ${objects.length + 1}\n`;
  trailer += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    trailer += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  trailer += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.concat([pdf, Buffer.from(trailer, "utf8")]);
};

export const createSanctionLetterPdf = ({ application, user }) => {
  const loanAmount = Number(application.loan_amount || application.monthly_income || 0);
  const interestRate = Number(process.env.SANCTION_DAILY_INTEREST_RATE || 0.9);
  const tenureDays = Number(process.env.SANCTION_TENURE_DAYS || 32);
  const processingFeePercent = Number(process.env.SANCTION_PROCESSING_FEE_PERCENT || 3);
  const processingFee = Math.round((loanAmount * processingFeePercent) / 100);
  const interestAmount = Math.round((loanAmount * interestRate * tenureDays) / 100);
  const repaymentAmount = loanAmount + interestAmount;
  const borrowerName = application.full_name || user?.name || "Customer";
  const applicationId = application.application_id || `WAQTMN-${application.id}`;
  const sanctionDate = formatDate(application.submit_at || application.created_at || new Date());
  const logoImage = readPngLogo();
  const parts = [];

  addRect(parts, 0, 0, 595, 842, "1 1 1");
  addRect(parts, 0, 834, 595, 8, "0.32 0.13 0.80");
  addRect(parts, 0, 826, 595, 8, "0.98 0.37 0.05");
  addRect(parts, 36, 716, 523, 96, "1 1 1", "0.88 0.86 0.94");
  addRect(parts, 36, 716, 5, 96, "0.32 0.13 0.80");

  if (logoImage) {
    addImage(parts, "Logo", 56, 752, 108, 72);
  } else {
    addText(parts, "Waqt", 56, 780, 24, { bold: true, color: "0.36 0.15 0.82" });
    addText(parts, "Money", 118, 780, 24, { bold: true, color: "0.95 0.30 0.05" });
  }

  addText(parts, COMPANY_ADDRESS, 56, 746, 8.2, { color: "0.34 0.38 0.48" });
  addText(parts, "Loan Sanction Letter", 347, 778, 17, { bold: true, color: "0.04 0.11 0.22" });
  addText(parts, `Generated: ${sanctionDate}`, 415, 756, 8.5, { color: "0.36 0.40 0.50" });
  addText(parts, `Application ID: ${applicationId}`, 371, 740, 8.5, { color: "0.36 0.40 0.50" });

  addText(parts, `Dear ${borrowerName},`, 56, 684, 11, { bold: true });
  addWrappedText(
    parts,
    "We are pleased to inform you that your Waqt Money short-term personal loan request has been sanctioned, subject to final verification, agreement execution, and applicable policy checks.",
    56,
    666,
    98,
    12,
    9,
    { color: "0.18 0.22 0.30" }
  );

  addSectionTitle(parts, "Borrower & Application Details", 56, 612);
  addRow(parts, "Application ID", applicationId, 56, 588);
  addRow(parts, "Borrower Name", borrowerName, 56, 560);
  addRow(parts, "Registered Mobile", application.mobile || user?.mobile || "-", 56, 532);
  addRow(parts, "PAN Number", application.pan_number || "-", 56, 504);
  addRow(parts, "Employment Type", application.employment_status || "-", 56, 476);

  addSectionTitle(parts, "Sanction Terms", 56, 438);
  addRow(parts, "Sanctioned Loan Amount", currency(loanAmount), 56, 414);
  addRow(parts, "Loan Type", application.loan_type || "Payday Personal Loan", 56, 386);
  addRow(parts, "Tenure", `${tenureDays} days`, 56, 358);
  addRow(parts, "Interest Rate", `${interestRate}% per day`, 56, 330);
  addRow(parts, "Processing Fee", `${currency(processingFee)} (${processingFeePercent}%)`, 56, 302);
  addRow(parts, "Estimated Interest", currency(interestAmount), 56, 274);
  addRow(parts, "Estimated Repayment Amount", currency(repaymentAmount), 56, 246);

  addSectionTitle(parts, "Important Conditions", 56, 208);
  const signatoryY = addConditionList(parts, [
    "Disbursal is subject to successful KYC, bank verification, documentation, and internal policy approval.",
    "Final repayment amount may change based on actual disbursal date, repayment date, charges, and applicable taxes.",
    "Borrower must repay on or before the due date communicated by Waqt Money or its lending partner.",
    "Late payment, bounce, or default charges may apply as per the executed loan agreement.",
    "This is a system-generated sanction letter and does not require a physical signature.",
  ], 56, 184);

  const signatureLineY = Math.max(70, signatoryY - 18);
  addLine(parts, 56, signatureLineY, 230, signatureLineY, "0.47 0.22 0.89");
  addText(parts, "Authorized Signatory", 56, signatureLineY - 16, 9.5, { bold: true });
  addStrokeRect(parts, 36, 36, 523, 776, "0.93 0.91 0.97");

  return buildPdf(parts.join("\n"), logoImage);
};
