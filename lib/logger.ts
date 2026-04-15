/**
 * Structured logger with correlation IDs and context.
 * Outputs JSON in production for log aggregation tools (Vercel Logs, Datadog, etc.).
 * Uses human-readable format in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  /** Unique request/correlation ID for tracing across services */
  requestId?: string;
  /** User performing the action */
  userId?: string;
  /** Tenant scope */
  tenantId?: string;
  /** API route or component name */
  source?: string;
  /** HTTP method */
  method?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Additional structured data */
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === 'production';

function formatMessage(level: LogLevel, message: string, context?: LogContext, error?: unknown): string {
  if (isProduction) {
    // Structured JSON for log aggregation
    const entry: Record<string, unknown> = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error !== undefined) {
      entry.error = String(error);
    }

    return JSON.stringify(entry);
  }

  // Human-readable for development
  const prefix = context?.source ? `[${context.source}]` : '';
  const id = context?.requestId ? ` (${context.requestId.slice(0, 8)})` : '';
  const tenant = context?.tenantId ? ` tenant=${context.tenantId.slice(0, 8)}` : '';
  const user = context?.userId ? ` user=${context.userId.slice(0, 8)}` : '';
  const duration = context?.durationMs !== undefined ? ` ${context.durationMs}ms` : '';

  let msg = `${prefix}${id}${tenant}${user} ${message}${duration}`;

  if (error instanceof Error) {
    msg += `\n  Error: ${error.message}`;
  }

  return msg;
}

/**
 * Create a scoped logger with pre-filled context.
 * Use this at the top of API route handlers.
 *
 * @example
 * ```ts
 * const log = createLogger('api/courses/[id]', request);
 * log.info('Fetching course', { courseId: id });
 * log.error('Database query failed', { query: 'courses' }, error);
 * ```
 */
export function createLogger(source: string, request?: { headers: { get(name: string): string | null } }) {
  const baseContext: LogContext = {
    source,
    requestId: request?.headers?.get('x-request-id') || request?.headers?.get('x-vercel-id') || generateRequestId(),
    userId: request?.headers?.get('x-user-id') || undefined,
    tenantId: request?.headers?.get('x-tenant-id') || undefined,
  };

  return {
    debug(message: string, context?: LogContext) {
      if (!isProduction) {
        console.debug(formatMessage('debug', message, { ...baseContext, ...context }));
      }
    },

    info(message: string, context?: LogContext) {
      console.log(formatMessage('info', message, { ...baseContext, ...context }));
    },

    warn(message: string, context?: LogContext) {
      console.warn(formatMessage('warn', message, { ...baseContext, ...context }));
    },

    error(message: string, context?: LogContext, error?: unknown) {
      console.error(formatMessage('error', message, { ...baseContext, ...context }, error));
    },

    /** Log the start and end of an async operation, including duration. */
    async measure<T>(label: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        const durationMs = Date.now() - start;
        console.log(formatMessage('info', `${label} completed`, { ...baseContext, ...context, durationMs }));
        return result;
      } catch (err) {
        const durationMs = Date.now() - start;
        console.error(formatMessage('error', `${label} failed`, { ...baseContext, ...context, durationMs }, err));
        throw err;
      }
    },

    /** Return child logger with additional context */
    child(childContext: LogContext) {
      return createLogger(source, request);
    },
  };
}

/** Standalone log functions for non-request contexts (cron jobs, background tasks) */
export const logger = {
  debug(message: string, context?: LogContext) {
    if (!isProduction) {
      console.debug(formatMessage('debug', message, context));
    }
  },
  info(message: string, context?: LogContext) {
    console.log(formatMessage('info', message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(formatMessage('warn', message, context));
  },
  error(message: string, context?: LogContext, error?: unknown) {
    console.error(formatMessage('error', message, context, error));
  },
};

function generateRequestId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
