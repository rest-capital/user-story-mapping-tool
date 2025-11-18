import { Logger } from '@nestjs/common';
export declare class AppLogger extends Logger {
    log(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
}
//# sourceMappingURL=logger.util.d.ts.map