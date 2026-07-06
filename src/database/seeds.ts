import { DestinatarioPermiso } from '../models/destinatarioPermiso';
import { TipoPermiso, TIPOS_PERMISO_SEED } from '../models/tipoPermiso';
import { ConfigEmpresa, CONFIG_EMPRESAS_SEED } from '../models/configEmpresa';
import { PlantillaCertificado, PLANTILLAS_CERTIFICADO_SEED } from '../models/plantillaCertificado';

export async function runSeeds() {
  await seedDestinatarios();
  await seedTiposPermiso();
  await seedConfigEmpresas();
  await seedPlantillasCertificado();
}

async function seedDestinatarios() {
  const count = await DestinatarioPermiso.count();
  if (count > 0) return;

  const fixedRaw = process.env.FIXED_RECIPIENTS?.split(',').map(e => e.trim()).filter(e => e) || [];
  const filteredRaw = process.env.FILTERED_RECIPIENTS?.split(',').map(e => e.trim()).filter(e => e) || [];

  const tiposFiltradosPorDefecto = [
    'Cita médica', 'Cita odontológica', 'Vacaciones', 'Incapacidad médica', 'Incapacidad laboral',
  ];

  const registros = [
    ...fixedRaw.map(email => ({ email, nombre: '', tipo: 'fijo' as const, tipos_permiso: [], es_cc: false, activo: true })),
    ...filteredRaw.map(email => ({ email, nombre: '', tipo: 'filtrado' as const, tipos_permiso: tiposFiltradosPorDefecto, es_cc: true, activo: true })),
  ];

  if (registros.length > 0) {
    await DestinatarioPermiso.bulkCreate(registros);
    console.log(`[Seed] Destinatarios: ${registros.length} registros creados`);
  }
}

async function seedTiposPermiso() {
  const existentes = await TipoPermiso.findAll({ attributes: ['nombre'] });
  const nombresExistentes = new Set(existentes.map((t: any) => t.nombre));
  const faltantes = (TIPOS_PERMISO_SEED as any[]).filter(t => !nombresExistentes.has(t.nombre));
  if (faltantes.length === 0) return;
  await TipoPermiso.bulkCreate(faltantes);
  console.log(`[Seed] Tipos de permiso: ${faltantes.length} nuevos registros creados`);
}

async function seedConfigEmpresas() {
  const count = await ConfigEmpresa.count();
  if (count > 0) return;

  await ConfigEmpresa.bulkCreate(CONFIG_EMPRESAS_SEED as any[]);
  console.log(`[Seed] Config empresas: ${CONFIG_EMPRESAS_SEED.length} registros creados`);
}

async function seedPlantillasCertificado() {
  try {
    const count = await PlantillaCertificado.count();
    if (count > 0) return;
    await PlantillaCertificado.bulkCreate(PLANTILLAS_CERTIFICADO_SEED as any[]);
    console.log(`[Seed] Plantillas de certificado: ${PLANTILLAS_CERTIFICADO_SEED.length} registros creados`);
  } catch (_e) {
    console.warn('[Seed] No se pudieron crear plantillas de certificado:', _e);
  }
}
