import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const startupLogPath = path.join(__dirname, "startup-error.log");

const formatStartupError = (error) => {
  if (!error) return "Unknown startup error";
  return error.stack || error.message || String(error);
};

const writeStartupError = (label, error) => {
  const line = [
    `\n[${new Date().toISOString()}] ${label}`,
    formatStartupError(error),
  ].join("\n");

  try {
    fs.appendFileSync(startupLogPath, `${line}\n`, "utf8");
  } catch {
    // If the host blocks file writes, keep the original stderr output available.
  }

  console.error(line);
};

process.on("uncaughtException", (error) => {
  writeStartupError("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  writeStartupError("unhandledRejection", reason);
});

const startServer = async () => {
  try {
    await import("./src/configs/env.js");

    const [{ default: app }, { default: transporter }, { default: logger }] = await Promise.all([
      import("./src/app.js"),
      import("./src/configs/mailer.js"),
      import("./src/utils/logger.js"),
    ]);

    const PORT = Number.parseInt(process.env.PORT || "5000", 10);

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    transporter
      .verify()
      .then(() => {
        logger.info("SMTP transport verified.");
      })
      .catch((error) => {
        logger.error("SMTP verification failed:", error.message);
      });
  } catch (error) {
    writeStartupError("startup failed", error);
    process.exitCode = 1;
  }
};

startServer();
