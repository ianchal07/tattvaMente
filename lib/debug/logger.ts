export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  service: string;
  message: string;
  data?: unknown;
  timestamp: number;
  stack?: string;
}

export class Logger {
  private readonly serviceName: string;

  private level: LogLevel = LogLevel.INFO;

  private readonly logs: LogEntry[] = [];

  private readonly maxLogs = 1_000;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  debug(message: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: unknown) {
    this.log(LogLevel.ERROR, message, {
      ...((data as Record<string, unknown>) ?? {}),
      error: error
        ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          }
        : undefined,
    });
  }

  getLogs() {
    return [...this.logs];
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      service: this.serviceName,
      message,
      data,
      timestamp: Date.now(),
      stack: level === LogLevel.ERROR ? new Error().stack : undefined,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }

    if (process.env.NODE_ENV !== "production") {
      const label = `[${this.serviceName}]`;
      if (level === LogLevel.ERROR) {
        console.error(label, message, data);
      } else if (level === LogLevel.WARN) {
        console.warn(label, message, data);
      } else if (level === LogLevel.INFO) {
        console.info(label, message, data);
      } else {
        console.debug(label, message, data);
      }
    }
  }
}