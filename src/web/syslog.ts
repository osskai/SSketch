import safeStringify from 'fast-safe-stringify';
import replaceString from 'replace-string'
import yaml from 'js-yaml';

const LEVELS_MAP = {
    fatal: 0,
    error: 1,
    warn: 2,
    debug: 3,
    info: 4,
    all: 8,
};

/** Available log levels. */
export type LEVEL = keyof typeof LEVELS_MAP

interface LogLine {
    level: string
    message: string
    data: Array<any>
}

const levelColorMap = new Map<LEVEL, string>();
levelColorMap.set("fatal", 'color: red');
levelColorMap.set("error", 'color: red');
levelColorMap.set("warn", 'color: yellow');
levelColorMap.set("debug", 'color: white');
levelColorMap.set("info", 'color: blue');

/** Creates a new logger instance. */
export class Logger {
    level: LEVEL = 'all';
    devMode = process.env.NODE_ENV === 'development';

    constructor() {
    }

    /**
     * Logs a message at the given log level.
     * @param level Log level for the message.
     * @param message The message to log.
     * @param data Any additional data to log with the message. This can be any type.
     */
    log(level: LEVEL, message: string, data: Array<any>): void {
        if (LEVELS_MAP[level] > LEVELS_MAP[this.level]) {
            return;
        }

        const logLineObject: LogLine = {
            level: level.toUpperCase(),
            message,
            data,
        };

        // Create JSON string with all the exotic values converted to JSON safe versions
        let logLine: any = safeStringify(logLineObject, (_key: string, value: any) => {
            if (typeof value === 'bigint') {
                return value.toString()
            }
            if (value instanceof Map) {
                return Array.from(value.entries())
            }
            if (value instanceof Set) {
                return Array.from(value)
            }

            return value;
        }, 2);

        // Format the logs in a human friendly way in development mode
        if (this.devMode) {
            // Construct the main log line and add some highlighting styles
            // Just parse the production log because it already has all the data conversions applied
            const log: LogLine = JSON.parse(logLine);
            logLine = log.message;
            if (log.data.length > 0) {
                let data = yaml.safeDump(log.data, {schema: yaml.JSON_SCHEMA, lineWidth: Infinity});
                data = data
                    .trim()
                    .split('\n')
                    .map((line: any) => `  ${line}`)
                    .join('\n');

                // Shorten the absolute file paths
                //@ts-ignore
                data = replaceString(data, process.cwd(), '.');

                logLine += `\n${data}`;
            }

            console.log(`%c ${log.level}:`, levelColorMap.get(level), logLine);
        }
    }

    /**
     * Logs a message at the fatal log level.
     * @param message The message to log.
     * @param data Any additional data to log with the message. This can be any type.
     */
    fatal(message: string, data?: any): void {
        this.log('fatal', message, data)
    }

    /**
     * Logs a message at the ERROR log level.
     * @param message The message to log.
     * @param data Any additional data to log with the message. This can be any type.
     */
    error(message: string, data?: any): void {
        this.log('error', message, data)
    }

    /**
     * Logs a message at the WARN log level.
     * @param message The message to log.
     * @param data Any additional data to log with the message. This can be any type.
     */
    warn(message: string, data?: any): void {
        this.log('warn', message, data)
    }

    /**
     * Logs a message at the INFO log level.
     * @param message The message to log.
     * @param data Any additional data to log with the message. This can be any type.
     */
    info(message: string, data?: any): void {
        this.log('info', message, data)
    }

    /**
     * Logs a message at the DEBUG log level.
     * @param message The message to log.
     * @param data Any additional data to log with the message. This can be any type.
     */
    debug(message: string, data?: any): void {
        this.log('debug', message, data)
    }
}

/**
 * @class Syslog
 * wrapper for the console log
 */
class Syslog {

    private log: Logger;

    constructor() {
        this.log = new Logger();
    }

    raise_error(msg: string, code: any, ...data: any) {
        this.error(msg, data);
        // print the stack
        console.trace();
        throw code;
    }

    info(msg: string, ...data: any) {
        this.log.info(msg, data);
    }

    fatal(msg: string, ...data: any) {
        this.log.fatal(msg, data);
    }

    error(msg: string, ...data: any) {
        this.log.error(msg, data);
    }

    warn(msg: string, ...data: any) {
        this.log.warn(msg, data);
    }

    debug(msg: string, ...data: any) {
        this.log.debug(msg, data);
    }
}


export const syslog = new Syslog();
