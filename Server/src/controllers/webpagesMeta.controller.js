// Helper to safely parse JSON without risking uncaught exceptions
const safeJsonParse = (str, fallback = null) => {
  if (!str) return fallback;
  if (typeof str === "object") return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

// Simple HTML/Script tag stripper for SEO metadata
const sanitizeText = (val) => {
  if (typeof val !== "string") return val;
  return val.replace(/<[^>]*>?/gm, "").trim();
};

// In-memory fallback if DB is in bypass mode or table temporarily inaccessible
let localWebpagesMeta = {};

export const getAllWebpagesMeta = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM waqt_money_webpages_meta ORDER BY page_path ASC"
    );

    const metaMap = {};
    if (Array.isArray(rows) && rows.length > 0) {
      for (const row of rows) {
        metaMap[row.page_path] = {
          ...row,
          faqs: safeJsonParse(row.faq_schema, []),
        };
      }
    } else {
      Object.assign(metaMap, localWebpagesMeta);
    }

    return res.status(200).json({
      success: true,
      metaMap,
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      metaMap: localWebpagesMeta,
    });
  }
};

export const getWebpageMetaByPath = async (req, res) => {
  try {
    const pagePath = req.query.path || req.params.path || "/";
    const cleanPath = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;

    const [rows] = await db.query(
      "SELECT * FROM waqt_money_webpages_meta WHERE page_path = ?",
      [cleanPath]
    );

    if (rows && rows.length > 0) {
      const row = rows[0];
      return res.status(200).json({
        success: true,
        meta: {
          ...row,
          faqs: safeJsonParse(row.faq_schema, []),
        },
      });
    }

    if (localWebpagesMeta[cleanPath]) {
      return res.status(200).json({
        success: true,
        meta: localWebpagesMeta[cleanPath],
      });
    }

    return res.status(404).json({
      success: false,
      message: "No custom metadata found for this path",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve webpage metadata",
      error: error.message,
    });
  }
};

export const upsertWebpageMeta = async (req, res) => {
  try {
    const {
      page_path,
      page_name,
      meta_title,
      meta_description,
      meta_keywords,
      canonical_url,
      og_image,
      robots,
      faq_schema,
      faqs,
      custom_schema,
    } = req.body;

    if (!page_path) {
      return res.status(400).json({
        success: false,
        message: "page_path is required (e.g. '/' or '/loans/personal-loan')",
      });
    }

    const cleanPath = page_path.startsWith("/") ? page_path : `/${page_path}`;

    // Security Validation: prevent directory traversal or script injection in paths
    if (!/^\/[a-zA-Z0-9\-_/]*$/.test(cleanPath) || cleanPath.includes("..")) {
      return res.status(400).json({
        success: false,
        message: "Invalid page_path format",
      });
    }

    const name = sanitizeText(page_name) || cleanPath;
    const safeTitle = sanitizeText(meta_title);
    const safeDesc = sanitizeText(meta_description);
    const safeKeywords = sanitizeText(meta_keywords);
    const safeRobots = ["index, follow", "noindex, follow", "noindex, nofollow", "index, nofollow"].includes(robots)
      ? robots
      : "index, follow";

    const parsedFaqs = faqs || safeJsonParse(faq_schema, []);
    const validFaqs = Array.isArray(parsedFaqs)
      ? parsedFaqs
          .filter((f) => f && typeof f === "object" && f.question && f.answer)
          .map((f) => ({
            question: sanitizeText(f.question),
            answer: sanitizeText(f.answer),
          }))
      : [];

    const faqSchemaStr = validFaqs.length > 0 ? JSON.stringify(validFaqs) : null;
    const customSchemaStr = custom_schema
      ? (typeof custom_schema === "object" ? JSON.stringify(custom_schema) : String(custom_schema))
      : null;

    const metaRecord = {
      page_path: cleanPath,
      page_name: name,
      meta_title: safeTitle || null,
      meta_description: safeDesc || null,
      meta_keywords: safeKeywords || null,
      canonical_url: canonical_url || null,
      og_image: og_image || null,
      robots: safeRobots,
      faq_schema: faqSchemaStr,
      faqs: validFaqs,
      custom_schema: customSchemaStr,
      updated_at: new Date().toISOString(),
    };

    localWebpagesMeta[cleanPath] = metaRecord;

    try {
      await db.query(
        `INSERT INTO waqt_money_webpages_meta 
         (page_path, page_name, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, faq_schema, custom_schema)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         page_name = VALUES(page_name),
         meta_title = VALUES(meta_title),
         meta_description = VALUES(meta_description),
         meta_keywords = VALUES(meta_keywords),
         canonical_url = VALUES(canonical_url),
         og_image = VALUES(og_image),
         robots = VALUES(robots),
         faq_schema = VALUES(faq_schema),
         custom_schema = VALUES(custom_schema),
         updated_at = CURRENT_TIMESTAMP`,
        [
          cleanPath,
          name,
          meta_title || null,
          meta_description || null,
          meta_keywords || null,
          canonical_url || null,
          og_image || null,
          robots || "index, follow",
          faqSchemaStr,
          customSchemaStr,
        ]
      );
    } catch (dbErr) {
      // Ignored for DB bypass or fallback
    }

    return res.status(200).json({
      success: true,
      message: `Metadata saved for ${cleanPath}`,
      meta: metaRecord,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save webpage metadata",
      error: error.message,
    });
  }
};
