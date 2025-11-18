"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLogger = void 0;
const common_1 = require("@nestjs/common");
class AppLogger extends common_1.Logger {
    log(message, context) {
        super.log(message, context);
    }
    error(message, trace, context) {
        super.error(message, trace, context);
    }
    warn(message, context) {
        super.warn(message, context);
    }
    debug(message, context) {
        super.debug(message, context);
    }
    verbose(message, context) {
        super.verbose(message, context);
    }
}
exports.AppLogger = AppLogger;
//# sourceMappingURL=logger.util.js.map