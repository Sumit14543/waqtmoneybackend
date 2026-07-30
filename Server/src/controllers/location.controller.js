import { processAndSaveLocation } from "../services/location.service.js";

/**
 * Controller endpoint to save background GPS location & reverse geocode
 */
export const saveLocation = async (req, res) => {
  try {
    const {
      applicationId,
      id,
      latitude,
      longitude,
      accuracy,
      capturedAt,
      locationPermission,
      device,
      deviceType,
      browser,
      operatingSystem,
      userAgent,
    } = req.body;

    const targetAppId = String(applicationId || id || "").trim();

    if (!targetAppId) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    // Extract IP address from headers/socket
    const rawIp =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      "";
    const ipAddress = String(rawIp).split(",")[0].trim();

    const result = await processAndSaveLocation({
      applicationId: targetAppId,
      latitude,
      longitude,
      accuracy,
      capturedAt,
      locationPermission,
      deviceType: deviceType || device,
      browser,
      operatingSystem,
      userAgent: userAgent || req.headers["user-agent"],
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Background location processed successfully",
      data: result.data || null,
    });
  } catch (error) {
    // Never fail loan application flow due to location processing
    return res.status(200).json({
      success: true,
      message: "Location processing skipped due to internal error",
    });
  }
};
