/**
 * Client-side Logger
 * Replaces console logs in production builds with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // Log everything in development
    }

    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context,
      stack: level === 'error' ? new Error().stack : undefined
    };
  }

  private persistLog(entry: LogEntry): void {
    // Add to in-memory store
    this.logs.unshift(entry);
    
    // Trim if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // In production, send critical errors to server
    if (!this.isDevelopment && entry.level === 'error') {
      this.sendToServer(entry);
    }
  }

  private sendToServer(entry: LogEntry): void {
    // Send error to server for monitoring (fire and forget)
    fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(() => {
      // Silently fail if server isn't available
    });
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.createLogEntry('debug', message, context);
    this.persistLog(entry);
    
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;

    const entry = this.createLogEntry('info', message, context);
    this.persistLog(entry);
    
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.createLogEntry('warn', message, context);
    this.persistLog(entry);
    
    console.warn(`[WARN] ${message}`, context || '');
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    if (!this.shouldLog('error')) return;

    let errorContext = { ...context };
    
    if (error instanceof Error) {
      errorContext.errorName = error.name;
      errorContext.errorMessage = error.message;
      errorContext.errorStack = error.stack;
    } else if (error) {
      errorContext.error = String(error);
    }

    const entry = this.createLogEntry('error', message, errorContext);
    this.persistLog(entry);
    
    console.error(`[ERROR] ${message}`, error || '', context || '');
  }

  // Get recent logs for debugging
  getRecentLogs(limit = 50): LogEntry[] {
    return this.logs.slice(0, limit);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Export logs as JSON for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton logger instance
export const logger = new Logger();

// Convenience exports
export const { debug, info, warn, error } = logger;