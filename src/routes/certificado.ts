import { Router } from "express";
import {
  generarCertificadoLaboral,
  generarCertificadoHTML,
  generarCertificadoImagen,
  generarCertificadoCesantias,
  generarCertificadoTerminacion,
  generarDesprendiblePago,
  generarCertificadoVacaciones,
} from "../controllers/certificado";
import validateToken from "./validateToken";

const router = Router();

// Generar certificado en formato JSON
router.get("/:Uid", validateToken, generarCertificadoLaboral);

// Generar certificado en formato HTML (para visualizar o imprimir)
router.get("/:Uid/html", validateToken, generarCertificadoHTML);

// Generar certificado como IMAGEN PNG (seguro y no editable)
router.get("/:Uid/imagen", validateToken, generarCertificadoImagen);

// Generar certificado de Cesantías
router.get("/:Uid/cesantias", validateToken, generarCertificadoCesantias);

// Generar certificado de Terminación
router.get("/:Uid/terminacion", validateToken, generarCertificadoTerminacion);

// Generar Desprendible de Pago
router.post("/desprendible", validateToken, generarDesprendiblePago);

// Generar Certificado de Vacaciones
router.post("/vacaciones", validateToken, generarCertificadoVacaciones);

export default router;
