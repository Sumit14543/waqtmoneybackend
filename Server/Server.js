import "./src/configs/env.js";
import app from "./src/app.js";
import transporter from "./src/configs/mailer.js";
import logger from "./src/utils/logger.js";

const PORT = Number.parseInt(process.env.PORT || "5000", 10);

const startServer = () => {
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
};

startServer();
