"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
try {
    require('dotenv').config();
}
catch (e) { }
const logger_1 = require("@libs/logger");
const sentry_1 = require("@libs/sentry");
const otel_1 = require("@libs/otel");
const metrics_1 = require("../../../libs/shared/metrics");
const request_id_middleware_1 = require("../../../libs/shared/middleware/request-id.middleware");
const http_exception_filter_1 = require("../../../libs/shared/filters/http-exception.filter");
async function bootstrap() {
    (0, sentry_1.initSentry)();
    const otel = await (0, otel_1.initOpenTelemetry)();
    (0, metrics_1.initMetrics)();
        const DB_USER = process.env.DB_USER || process.env.DB_USER_NAME || process.env.DB_USERNAME || process.env.DBUSER || "";
        const DB_PASSWORD = process.env.DB_PASSWORD || process.env.DB_PASS || process.env.DBPASSWORD || "";
        const DB_HOST = process.env.DB_HOST || "localhost";
        const DB_PORT = process.env.DB_PORT || "5432";
        const DB_NAME = process.env.DB_NAME || process.env.POSTGRES_DB || "erp_main";
        if (DB_USER && DB_PASSWORD) {
        }
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { logger: false });
    const logger = (0, logger_1.childLogger)({ process: "api" });
    const fromEnv = String(process.env.DRY_RUN || "").toLowerCase() === "true";
    const fromArg = process.argv.includes("--dry-run");
    const isDryRun = fromEnv || fromArg;
    const server = app.getHttpAdapter().getInstance();
    if (server && typeof server.locals === "object") {
        server.locals.isDryRun = isDryRun;
    }
    app.use((req, res, next) => new request_id_middleware_1.RequestIdMiddleware().use(req, res, next));
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    server.get("/metrics", async (req, res) => {
        try {
            res.setHeader("Content-Type", metrics_1.register.contentType);
            res.end(await metrics_1.register.metrics());
        }
        catch (err) {
            logger.error({ err }, "metrics failure");
            res.status(500).end();
        }
    });
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.info({ port }, "api started");
    const graceful = async () => {
        logger.info("shutdown requested");
        try {
            await app.close();
        }
        catch (e) {
            logger.error({ e }, "error closing app");
        }
        try {
            await (0, otel_1.shutdownOpenTelemetry)();
        }
        catch (e) {
            logger.error({ e }, "otel shutdown err");
        }
        process.exit(0);
    };
    process.on("SIGTERM", graceful);
    process.on("SIGINT", graceful);
}
bootstrap().catch((err) => {
    console.error("bootstrap failed", err);
    process.exit(1);
});
