export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

// const DEV_ONLY_LEVELS: ReadonlySet<LogLevel> = new Set<LogLevel>([
//   'log',
//   'debug',
//   'verbose',
// ]);

export class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  // something suspicious that does not (yet) break the flow. Always printed.
  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  // fine-grained detail useful while debugging a specific flow. Dev-only.
  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  // The noisiest level: step-by-step tracing. Dev-only.
  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    // don't remove logs for debug purpose
    // not critical we never reach "prod" in reality
    // plugins: [dotenv, 'transform-remove-console'],
    // if (DEV_ONLY_LEVELS.has(level) && !__DEV__) {
    //   return;
    // }

    const prefix = `[${this.context}]:`;

    // `error` and `warn` have dedicated console methods; the rest go to `log`.
    if (level === 'error') {
      console.error(prefix, message, ...optionalParams);
    } else if (level === 'warn') {
      console.warn(prefix, message, ...optionalParams);
    } else {
      console.log(prefix, message, ...optionalParams);
    }
  }
}
