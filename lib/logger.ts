/**
 * Structured Logging System
 * Provides consistent logging with context, error tracking, and performance monitoring
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  userId?: string;
  requestId?: string;
  meetingId?: string;
  endpoint?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private currentLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.currentLevel = level;
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(message: string, context: LogContext = {}) {
    if (this.currentLevel <= LogLevel.DEBUG) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message,
        context,
      };
      console.debug(this.formatLog(entry));
      this.addLog(entry);
    }
  }

  info(message: string, context: LogContext = {}) {
    if (this.currentLevel <= LogLevel.INFO) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        context,
      };
      console.log(this.formatLog(entry));
      this.addLog(entry);
    }
  }

  warn(message: string, context: LogContext = {}) {
    if (this.currentLevel <= LogLevel.WARN) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        context,
      };
      console.warn(this.formatLog(entry));
      this.addLog(entry);
    }
  }

  error(message: string, error?: Error | unknown, context: LogContext = {}) {
    if (this.currentLevel <= LogLevel.ERROR) {
      const errorObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : typeof error === 'string'
          ? { message: error }
          : { message: 'Unknown error' };

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        context,
        error: errorObj,
      };
      console.error(this.formatLog(entry));
      this.addLog(entry);
    }
  }

  getLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }
}

export const logger = new Logger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

export { LogContext, LogEntry, LogLevel };

