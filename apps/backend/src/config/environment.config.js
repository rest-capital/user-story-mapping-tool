"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironmentConfig = void 0;
const getEnvironmentConfig = () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
});
exports.getEnvironmentConfig = getEnvironmentConfig;
//# sourceMappingURL=environment.config.js.map