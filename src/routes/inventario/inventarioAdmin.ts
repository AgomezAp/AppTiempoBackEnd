import { Router } from 'express';
import { validateAdmin } from '../../controllers/archivo';
import {
  getInventarioCompleto,
  editarDispositivo, ocultarDispositivo, restaurarDispositivo,
  editarMobiliario, ocultarMobiliario, restaurarMobiliario,
  editarConsumible, ocultarConsumible, restaurarConsumible,
  crearInventarioCompleto, listarTiposInventario,
  getCamposPorTipo, crearCampo, actualizarCampo, eliminarCampo,
} from '../../controllers/inventario/inventarioAdmin';

const router = Router();

router.get('/', validateAdmin, getInventarioCompleto);
router.get('/tipos', validateAdmin, listarTiposInventario);
router.post('/crear-inventario', validateAdmin, crearInventarioCompleto);

router.put('/dispositivo/:id',            validateAdmin, editarDispositivo);
router.patch('/dispositivo/:id/ocultar',  validateAdmin, ocultarDispositivo);
router.patch('/dispositivo/:id/restaurar',validateAdmin, restaurarDispositivo);

router.put('/mobiliario/:id',             validateAdmin, editarMobiliario);
router.patch('/mobiliario/:id/ocultar',   validateAdmin, ocultarMobiliario);
router.patch('/mobiliario/:id/restaurar', validateAdmin, restaurarMobiliario);

router.put('/consumible/:id',             validateAdmin, editarConsumible);
router.patch('/consumible/:id/ocultar',   validateAdmin, ocultarConsumible);
router.patch('/consumible/:id/restaurar', validateAdmin, restaurarConsumible);

router.get('/campos/:tipoId',   validateAdmin, getCamposPorTipo);
router.post('/campos',          validateAdmin, crearCampo);
router.put('/campos/:id',       validateAdmin, actualizarCampo);
router.delete('/campos/:id',    validateAdmin, eliminarCampo);

export default router;
