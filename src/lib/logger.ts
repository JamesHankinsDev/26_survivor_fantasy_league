/**
 * Production-safe logger utility
 * Filters console output based on environment
 */

type LogLevel = "log" | "info" | "warn" | "error" | "debug";

const isDevelopment = process.env.NODE_ENV === "development";

interface LoggerOptions {
  prefix?: string;
  timestamp?: boolean;
}

class Logger {
  private prefix: string;
  private showTimestamp: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || "";
    this.showTimestamp = options.timestamp ?? true;
  }

  private formatMessage(level: LogLevel, ...args: any[]): any[] {
    const parts: any[] = [];

    if (this.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.prefix) {
      parts.push(`[${this.prefix}]`);
    }

    parts.push(`[${level.toUpperCase()}]`);

    return [...parts, ...args];
  }

  /**
   * Log general information (dev only)
   */
  log(...args: any[]): void {
    if (isDevelopment) {
      console.log(...this.formatMessage("log", ...args));
    }
  }

  /**
   * Log informational messages (dev only)
   */
  info(...args: any[]): void {
    if (isDevelopment) {
      console.info(...this.formatMessage("info", ...args));
    }
  }

  /**
   * Log warnings (always shown)
   */
  warn(...args: any[]): void {
    console.warn(...this.formatMessage("warn", ...args));
  }

  /**
   * Log errors (always shown)
   * In production, you might want to send these to an error tracking service
   */
  error(...args: any[]): void {
    console.error(...this.formatMessage("error", ...args));

    // TODO: Send to error tracking service in production
    // if (!isDevelopment) {
    //   sendToErrorTracking(args);
    // }
  }

  /**
   * Log debug information (dev only, verbose)
   */
  debug(...args: any[]): void {
    if (isDevelopment) {
      console.debug(...this.formatMessage("debug", ...args));
    }
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
      timestamp: this.showTimestamp,
    });
  }
}

// Default logger instance
export const logger = new Logger();

// Create specialized loggers for different modules
export const authLogger = logger.child("Auth");
export const dbLogger = logger.child("Database");
export const apiLogger = logger.child("API");

// Export Logger class for custom instances
export { Logger };

/**
 * Usage examples:
 *
 * // Basic logging
 * logger.log("This only shows in development");
 * logger.error("This always shows");
 *
 * // Module-specific logging
 * authLogger.log("User signed in");
 * dbLogger.error("Failed to fetch data");
 *
 * // Create custom logger
 * const myLogger = new Logger({ prefix: "MyFeature" });
 * myLogger.log("Custom log");
 */
