import db from "../configs/db.js";
import logger from "../utils/logger.js";

const APPLICATION_TABLE = "waqt_money_loan_applications";
let locationColumnsReady = false;

/**
 * Ensures all location and reverse geocoding columns exist in waqt_money_loan_applications
 */
export const ensureLocationColumns = async () => {
  if (locationColumnsReady) return;

  try {
    const [existingColumns] = await db.execute(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
      [APPLICATION_TABLE]
    );

    const existingNames = new Set(existingColumns.map((col) => col.COLUMN_NAME));

    const columnsToAdd = [
      ["latitude", "VARCHAR(32) NULL"],
      ["longitude", "VARCHAR(32) NULL"],
      ["accuracy", "DECIMAL(10, 2) NULL"],
      ["full_address", "TEXT NULL"],
      ["house_number", "VARCHAR(100) NULL"],
      ["road", "VARCHAR(255) NULL"],
      ["locality", "VARCHAR(255) NULL"],
      ["village", "VARCHAR(255) NULL"],
      ["town", "VARCHAR(255) NULL"],
      ["city", "VARCHAR(255) NULL"],
      ["district", "VARCHAR(255) NULL"],
      ["state", "VARCHAR(255) NULL"],
      ["country", "VARCHAR(255) NULL"],
      ["pincode", "VARCHAR(20) NULL"],
      ["captured_at", "DATETIME NULL"],
      ["location_permission", "VARCHAR(50) DEFAULT 'pending'"],
      ["reverse_geocode_status", "VARCHAR(50) DEFAULT 'pending'"],
      ["device_type", "VARCHAR(50) NULL"],
      ["browser", "VARCHAR(100) NULL"],
      ["operating_system", "VARCHAR(100) NULL"],
      ["user_agent", "TEXT NULL"],
      ["ip_address", "VARCHAR(100) NULL"],
    ];

    for (const [name, definition] of columnsToAdd) {
      if (!existingNames.has(name)) {
        await db.execute(`ALTER TABLE ${APPLICATION_TABLE} ADD COLUMN ${name} ${definition}`);
      }
    }

    locationColumnsReady = true;
  } catch (error) {
    logger.error("Failed to ensure location columns:", error.message);
  }
};

/**
 * Validates GPS latitude, longitude, accuracy
 */
export const validateCoordinates = (lat, lng, acc) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return { valid: false, reason: "missing_coords" };
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const accNum = Number(acc);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return { valid: false, reason: "nan_coords" };
  }

  if (latNum === 0 && lngNum === 0) {
    return { valid: false, reason: "zero_coords" };
  }

  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return { valid: false, reason: "out_of_bounds" };
  }

  return {
    valid: true,
    latitude: latNum,
    longitude: lngNum,
    accuracy: Number.isNaN(accNum) ? null : accNum,
  };
};

/**
 * Reverse Geocode GPS coordinates using OpenStreetMap Nominatim API
 * Respects Nominatim usage policy with a custom User-Agent and timeout
 */
export const reverseGeocodeNominatim = async (lat, lng) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "WaqtMoney-Backend/1.0 (support@waqtmoney.in; https://waqtmoney.in)",
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(`Nominatim API returned HTTP ${response.status}`);
      return { status: "failed", error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (!data || !data.address) {
      return { status: "failed", error: "Empty address in response" };
    }

    const addr = data.address || {};

    const extracted = {
      status: "success",
      full_address: data.display_name || null,
      house_number: addr.house_number || addr.building || null,
      road: addr.road || addr.street || addr.pedestrian || null,
      locality: addr.suburb || addr.neighbourhood || addr.locality || addr.quarter || null,
      village: addr.village || addr.hamlet || null,
      town: addr.town || null,
      city: addr.city || addr.city_district || addr.municipality || null,
      district: addr.county || addr.state_district || addr.district || null,
      state: addr.state || null,
      country: addr.country || null,
      pincode: addr.postcode || null,
    };

    return extracted;
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMsg = err.name === "AbortError" ? "Network timeout (6s)" : err.message;
    logger.warn("Nominatim reverse geocoding error:", errorMsg);
    return { status: "failed", error: errorMsg };
  }
};

/**
 * Process location payload, perform reverse geocoding, and update application record in DB
 */
export const processAndSaveLocation = async (payload) => {
  try {
    await ensureLocationColumns();

    const {
      applicationId,
      id,
      latitude,
      longitude,
      accuracy,
      capturedAt,
      locationPermission,
      deviceType,
      browser,
      operatingSystem,
      userAgent,
      ipAddress,
    } = payload;

    const targetAppId = String(applicationId || id || "").trim();
    if (!targetAppId) {
      return { success: false, message: "Missing application ID" };
    }

    const coordCheck = validateCoordinates(latitude, longitude, accuracy);
    let locationPerm = String(locationPermission || (coordCheck.valid ? "granted" : "denied")).slice(0, 50);
    let reverseStatus = "pending";
    let geoData = {
      full_address: null,
      house_number: null,
      road: null,
      locality: null,
      village: null,
      town: null,
      city: null,
      district: null,
      state: null,
      country: null,
      pincode: null,
    };

    if (coordCheck.valid) {
      locationPerm = locationPermission || "granted";
      const geoResult = await reverseGeocodeNominatim(coordCheck.latitude, coordCheck.longitude);
      if (geoResult.status === "success") {
        reverseStatus = "success";
        geoData = geoResult;
      } else {
        reverseStatus = "failed";
      }
    } else {
      if (!locationPermission || locationPermission === "granted") {
        locationPerm = coordCheck.reason === "zero_coords" || coordCheck.reason === "missing_coords" ? "denied" : "error";
      }
      reverseStatus = "skipped";
    }

    // Format captured_at timestamp
    let capturedDate = new Date();
    if (capturedAt) {
      const parsed = new Date(capturedAt);
      if (!Number.isNaN(parsed.getTime())) {
        capturedDate = parsed;
      }
    }
    const formattedCapturedAt = capturedDate.toISOString().slice(0, 19).replace("T", " ");

    const latVal = coordCheck.valid ? String(coordCheck.latitude) : null;
    const lngVal = coordCheck.valid ? String(coordCheck.longitude) : null;
    const accVal = coordCheck.valid ? coordCheck.accuracy : null;

    const devType = String(deviceType || "Unknown").slice(0, 50);
    const bName = String(browser || "Unknown").slice(0, 100);
    const osName = String(operatingSystem || "Unknown").slice(0, 100);
    const uAgent = String(userAgent || "").slice(0, 1000);
    const ip = String(ipAddress || "").slice(0, 100);

    const [updateResult] = await db.execute(
      `UPDATE ${APPLICATION_TABLE}
       SET latitude = ?,
           longitude = ?,
           accuracy = ?,
           captured_at = ?,
           location_permission = ?,
           reverse_geocode_status = ?,
           full_address = ?,
           house_number = ?,
           road = ?,
           locality = ?,
           village = ?,
           town = ?,
           city = COALESCE(?, city),
           district = ?,
           state = ?,
           country = ?,
           pincode = COALESCE(?, pincode),
           device_type = ?,
           browser = ?,
           operating_system = ?,
           user_agent = ?,
           ip_address = ?,
           last_activity_at = NOW()
       WHERE application_id = ? OR id = ?`,
      [
        latVal,
        lngVal,
        accVal,
        formattedCapturedAt,
        locationPerm,
        reverseStatus,
        geoData.full_address,
        geoData.house_number,
        geoData.road,
        geoData.locality,
        geoData.village,
        geoData.town,
        geoData.city,
        geoData.district,
        geoData.state,
        geoData.country,
        geoData.pincode,
        devType,
        bName,
        osName,
        uAgent,
        ip,
        targetAppId,
        targetAppId,
      ]
    );

    logger.info("Background location processed for application:", {
      applicationId: targetAppId,
      permission: locationPerm,
      reverseGeocodeStatus: reverseStatus,
      city: geoData.city,
    });

    return {
      success: true,
      data: {
        applicationId: targetAppId,
        locationPermission: locationPerm,
        reverseGeocodeStatus: reverseStatus,
        fullAddress: geoData.full_address,
      },
    };
  } catch (error) {
    logger.error("Error processing background location:", error.message);
    return {
      success: false,
      message: "Internal error processing location",
      error: error.message,
    };
  }
};
