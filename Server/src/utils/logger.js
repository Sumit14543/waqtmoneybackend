const isProduction = process.env.NODE_ENV === "production";

const logger = {
  debug(...args) {
    if (!isProduction) {
      console.log(...args);
    }
  },
  info(...args) {
    console.log(...args);
  },
  warn(...args) {
    console.warn(...args);
  },
  error(...args) {
    console.error(...args);
  },
};

export default logger;
