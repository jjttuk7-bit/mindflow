type LogLevel = "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  path?: string
  userId?: string
  duration?: number
  error?: string
  [key: string]: unknown
}

function formatLog(entry: LogEntry): string {
  const timestamp = new Date().toISOString()
  const { level, message, ...meta } = entry
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ""
  return `[${timestamp}] ${level.toUpperCase()} ${message}${metaStr}`
}

export const logger = {
  info(message: string, meta?: Omit<LogEntry, "level" | "message">) {
    console.log(formatLog({ level: "info", message, ...meta }))
  },
  warn(message: string, meta?: Omit<LogEntry, "level" | "message">) {
    console.warn(formatLog({ level: "warn", message, ...meta }))
  },
  error(message: string, meta?: Omit<LogEntry, "level" | "message">) {
    console.error(formatLog({ level: "error", message, ...meta }))
  },
}

export function withLogging(handler: string) {
  return {
    start(userId?: string) {
      const startTime = Date.now()
      logger.info(`${handler} started`, { path: handler, userId })
      return {
        success(meta?: Record<string, unknown>) {
          const duration = Date.now() - startTime
          logger.info(`${handler} completed`, { path: handler, userId, duration, ...meta })
        },
        fail(error: unknown) {
          const duration = Date.now() - startTime
          const msg = error instanceof Error ? error.message : String(error)
          logger.error(`${handler} failed`, { path: handler, userId, duration, error: msg })
        },
      }
    },
  }
}
