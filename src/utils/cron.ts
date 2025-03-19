import cron from 'node-cron';
import { restarTiempoSabado } from '../controllers/time';

cron.schedule('0 2 1 * *', async () => {
    try {
        await restarTiempoSabado();
        console.log("Tiempo restado automaticamente")
    } catch(error) {
        console.error('Error al ejecutar la tarea', error)
    }
})