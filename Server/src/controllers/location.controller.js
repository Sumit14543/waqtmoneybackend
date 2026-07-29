import db from "../configs/db.js";

const APPLICATION_TABLE = process.env.APPLICATION_TABLE || "applications";

const ensureLocationColumns = async () => {
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
      ["latitude", "DECIMAL(10, 8) NULL"],
      ["longitude", "DECIMAL(11, 8) NULL"],
      ["accuracy", "FLOAT NULL"],
      ["captured_at", "DATETIME NULL"],
      ["device_type", "VARCHAR(50) NULL"],
      ["browser", "VARCHAR(100) NULL"],
      ["operating_system", "VARCHAR(100) NULL"],
      ["user_agent", "TEXT NULL"],
      ["ip_address", "VARCHAR(100) NULL"],
      ["location_status", "VARCHAR(50) NULL"],
      ["battery_status", "VARCHAR(50) NULL"],
      ["network_type", "VARCHAR(50) NULL"],
    ];

    for (const [name, definition] of columnsToAdd) {
      if (!existingNames.has(name)) {
        await db.execute(`ALTER TABLE ${APPLICATION_TABLE} ADD COLUMN ${name} ${definition}`);
      }
    }
  } catch (error) {
    console.error("Failed to ensure location columns:", error);
  }
};

export const saveLocation = async (req, res) => {
  try {
    await ensureLocationColumns();

    const {
      applicationId,
      id,
      latitude,
      longitude,
      accuracy,
      capturedAt,
      device,
      deviceType,
      browser,
      operatingSystem,
      userAgent,
      locationStatus,
      batteryStatus,
      networkType,
    } = req.body;

    const targetAppId = String(applicationId || id || "").trim();

    if (!targetAppId) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    // Validate coordinates - NEVER trust frontend data
    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    const accNum = Number(accuracy);

    if (
      latitude === undefined ||
      longitude === undefined ||
      Number.isNaN(latNum) ||
      Number.isNaN(lngNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lngNum < -180 ||
      lngNum > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude coordinates",
      });
    }

    // Extract IP address from request
    const rawIp =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      "";
    const ipAddress = String(rawIp).split(",")[0].trim();

    // Determine status
    let status = String(locationStatus || "captured");
    if (accNum > 100) {
      status = "low_accuracy";
    }

    // Format captured_at timestamp
    let capturedDate = new Date();
    if (capturedAt) {
      const parsedDate = new Date(capturedAt);
      if (!Number.isNaN(parsedDate.getTime())) {
        capturedDate = parsedDate;
      }
    }
    const formattedCapturedAt = capturedDate.toISOString().slice(0, 19).replace("T", " ");

    const devType = String(deviceType || device || "Unknown").slice(0, 50);
    const bName = String(browser || "Unknown").slice(0, 100);
    const osName = String(operatingSystem || "Unknown").slice(0, 100);
    const uAgent = String(userAgent || req.headers["user-agent"] || "").slice(0, 1000);
    const batt = String(batteryStatus || "").slice(0, 50);
    const net = String(networkType || "").slice(0, 50);

    const [updateResult] = await db.execute(
      `UPDATE ${APPLICATION_TABLE}
       SET latitude = ?,
           longitude = ?,
           accuracy = ?,
           captured_at = ?,
           device_type = ?,
           browser = ?,
           operating_system = ?,
           user_agent = ?,
           ip_address = ?,
           location_status = ?,
           battery_status = ?,
           network_type = ?
       WHERE application_id = ?`,
      [
        latNum,
        lngNum,
        Number.isNaN(accNum) ? null : accNum,
        formattedCapturedAt,
        devType,
        bName,
        osName,
        uAgent,
        ipAddress,
        status,
        batt,
        net,
        targetAppId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Location saved successfully",
      data: {
        applicationId: targetAppId,
        latitude: latNum,
        longitude: lngNum,
        accuracy: accNum,
        capturedAt: formattedCapturedAt,
        deviceType: devType,
        browser: bName,
        operatingSystem: osName,
        ipAddress,
        locationStatus: status,
      },
    });
  } catch (error) {
    console.error("Error saving location:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while saving location",
      error: error.message,
    });
  }
};
