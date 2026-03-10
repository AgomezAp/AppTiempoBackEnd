"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const time_1 = require("../controllers/time");
const adminAlerts_1 = require("../controllers/adminAlerts");
node_cron_1.default.schedule('0 2 1 * *', async () => {
    try {
        await (0, time_1.restarTiempoSabado)();
        console.log("Tiempo restado automaticamente");
    }
    catch (error) {
        console.error('Error al ejecutar la tarea de quitar tiempo automaticamente', error);
    }
});
// Daily alerts evaluation at 08:00 server time (does NOT send emails, only stores alerts)
node_cron_1.default.schedule('0 8 * * *', async () => {
    try {
        const created = await (0, adminAlerts_1.generateDailyAlerts)();
        console.log(`Daily alerts job completed. Alerts created: ${created.length}`);
    }
    catch (error) {
        console.error('Error running daily alerts job', error);
    }
});
