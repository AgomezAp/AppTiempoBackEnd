import { Router } from 'express';
import { validateAdmin } from '../controllers/archivo';
import {
  getEmpresas,
  getEmpresaByCodigo,
  updateEmpresa,
  uploadLogoEmpresa,
  uploadLogo,
} from '../controllers/configEmpresa';

const router = Router();

router.get('/', validateAdmin, getEmpresas);
router.get('/:codigo', validateAdmin, getEmpresaByCodigo);
router.put('/:codigo', validateAdmin, updateEmpresa);
router.post('/:codigo/imagen', validateAdmin, uploadLogo.single('imagen'), uploadLogoEmpresa);

export default router;
