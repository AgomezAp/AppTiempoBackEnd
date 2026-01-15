import cron from 'node-cron';
import { restarTiempoSabado } from '../controllers/time';
import { generateDailyAlerts } from '../controllers/adminAlerts';

cron.schedule('0 2 1 * *', async () => {
        try {
                await restarTiempoSabado();
                console.log("Tiempo restado automaticamente")
        } catch(error) {
                console.error('Error al ejecutar la tarea de quitar tiempo automaticamente', error)
        }
})

// Daily alerts evaluation at 08:00 server time (does NOT send emails, only stores alerts)
cron.schedule('0 8 * * *', async () => {
    try {
        const created = await generateDailyAlerts();
        console.log(`Daily alerts job completed. Alerts created: ${created.length}`);
    } catch (error) {
        console.error('Error running daily alerts job', error);
    }
});