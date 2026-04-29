/**
 * migrate.js - Script de migración idempotente para vincular usuarios
 * de inventario_general con los usuarios de api_inventario (horarios).
 *
 * Uso: node migrate.js
 * Puede ejecutarse múltiples veces sin duplicar datos.
 */

const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURACIÓN - Ajustar credenciales antes de ejecutar
// ============================================================
const CONFIG = {
    horarios: {
        url: process.env.DATABASE_URL_HORARIOS ||
             'postgres://alejandroap:PASSWORD_AQUI@185.137.92.54:5432/api_inventario',
        dialectOptions: {
            ssl: { require: true, rejectUnauthorized: false }
        }
    },
    inventario: {
        url: process.env.DATABASE_URL_INVENTARIO ||
             'postgres://alejandroap:PASSWORD_AQUI@185.137.92.54:5432/inventario_general',
        dialectOptions: {
            ssl: { require: true, rejectUnauthorized: false }
        }
    }
};

// Archivo de log para auditoría
const LOG_FILE = path.join(__dirname, `migration_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

const log = {
    fechaEjecucion: new Date().toISOString(),
    resumen: { totalInventario: 0, mapeados: 0, sinMapear: 0, errores: 0 },
    mapeados: [],
    sinMapear: [],
    errores: []
};

// ============================================================
// CONEXIONES
// ============================================================
const seqHorarios = new Sequelize(CONFIG.horarios.url, {
    dialect: 'postgres',
    dialectOptions: CONFIG.horarios.dialectOptions,
    logging: false
});

const seqInventario = new Sequelize(CONFIG.inventario.url, {
    dialect: 'postgres',
    dialectOptions: CONFIG.inventario.dialectOptions,
    logging: false
});

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================
async function ejecutarMigracion() {
    console.log('='.repeat(60));
    console.log('MIGRACIÓN: Vinculación de usuarios inventario → horarios');
    console.log('='.repeat(60));

    try {
        // Verificar conexiones
        await seqHorarios.authenticate();
        console.log('✓ Conexión a horarios (api_inventario) establecida');
        await seqInventario.authenticate();
        console.log('✓ Conexión a inventario (inventario_general) establecida');

        // Paso 1: Crear tabla de mapeo si no existe
        await crearTablaMapeo();

        // Paso 2: Obtener todos los usuarios de inventario
        const usuariosInventario = await seqInventario.query(
            'SELECT "Uid", nombre, apellido, correo FROM users ORDER BY "Uid"',
            { type: QueryTypes.SELECT }
        );
        log.resumen.totalInventario = usuariosInventario.length;
        console.log(`\nTotal usuarios en inventario: ${usuariosInventario.length}`);

        // Paso 3: Obtener todos los usuarios de horarios (para cruce)
        const usuariosHorarios = await seqHorarios.query(
            'SELECT "Uid", name, "lastName", email, "documentoIdentificacion" FROM users WHERE status = 1',
            { type: QueryTypes.SELECT }
        );
        console.log(`Total usuarios activos en horarios: ${usuariosHorarios.length}`);

        // Paso 4: Obtener mapeos ya existentes para no duplicar
        const mapeosExistentes = await seqInventario.query(
            'SELECT inventario_uid FROM user_mapping',
            { type: QueryTypes.SELECT }
        );
        const uidsMapeados = new Set(mapeosExistentes.map(m => m.inventario_uid));
        console.log(`Mapeos ya existentes: ${uidsMapeados.size}`);

        // Paso 5: Obtener cédulas de actas_entrega agrupadas por Uid de inventario
        const cedulasActas = await seqInventario.query(
            `SELECT DISTINCT ae."Uid", ae."cedulaReceptor"
             FROM actas_entrega ae
             WHERE ae."Uid" IS NOT NULL AND ae."cedulaReceptor" IS NOT NULL`,
            { type: QueryTypes.SELECT }
        );
        const cedulasPorUid = {};
        for (const row of cedulasActas) {
            if (!cedulasPorUid[row.Uid]) cedulasPorUid[row.Uid] = [];
            cedulasPorUid[row.Uid].push(row.cedulaReceptor.trim());
        }

        // Paso 6: Procesar cada usuario de inventario
        let nuevosMapeados = 0;

        for (const inv of usuariosInventario) {
            // Saltar si ya está mapeado
            if (uidsMapeados.has(inv.Uid)) continue;

            let horarioUid = null;
            let metodo = null;

            // Intento 1: Cruce por correo (más confiable)
            if (inv.correo) {
                const correoInv = inv.correo.toLowerCase().trim();
                const match = usuariosHorarios.find(
                    h => h.email && h.email.toLowerCase().trim() === correoInv
                );
                if (match) {
                    horarioUid = match.Uid;
                    metodo = 'correo';
                }
            }

            // Intento 2: Cruce por nombre + apellido
            if (!horarioUid && inv.nombre && inv.apellido) {
                const nomInv = inv.nombre.toLowerCase().trim();
                const apInv = inv.apellido.toLowerCase().trim();
                const match = usuariosHorarios.find(
                    h => h.name && h.lastName &&
                         h.name.toLowerCase().trim() === nomInv &&
                         h.lastName.toLowerCase().trim() === apInv
                );
                if (match) {
                    horarioUid = match.Uid;
                    metodo = 'nombre';
                }
            }

            // Intento 3: Cruce por cédula (de actas_entrega vs documentoIdentificacion)
            if (!horarioUid && cedulasPorUid[inv.Uid]) {
                for (const cedula of cedulasPorUid[inv.Uid]) {
                    const match = usuariosHorarios.find(
                        h => h.documentoIdentificacion &&
                             h.documentoIdentificacion.trim() === cedula
                    );
                    if (match) {
                        horarioUid = match.Uid;
                        metodo = 'cedula';
                        break;
                    }
                }
            }

            // Registrar resultado
            if (horarioUid) {
                try {
                    await seqInventario.query(
                        `INSERT INTO user_mapping (inventario_uid, horarios_uid, metodo_mapeo)
                         VALUES (:invUid, :horUid, :metodo)
                         ON CONFLICT DO NOTHING`,
                        {
                            replacements: { invUid: inv.Uid, horUid: horarioUid, metodo },
                            type: QueryTypes.INSERT
                        }
                    );
                    nuevosMapeados++;
                    uidsMapeados.add(inv.Uid);
                    log.mapeados.push({
                        inventario_uid: inv.Uid,
                        horarios_uid: horarioUid,
                        nombre: `${inv.nombre} ${inv.apellido}`,
                        metodo
                    });
                    console.log(`  ✓ [${metodo}] ${inv.nombre} ${inv.apellido} (inv:${inv.Uid} → hor:${horarioUid})`);
                } catch (err) {
                    log.errores.push({
                        inventario_uid: inv.Uid,
                        nombre: `${inv.nombre} ${inv.apellido}`,
                        error: err.message
                    });
                    console.log(`  ✗ Error al mapear ${inv.nombre} ${inv.apellido}: ${err.message}`);
                }
            } else {
                log.sinMapear.push({
                    inventario_uid: inv.Uid,
                    nombre: inv.nombre,
                    apellido: inv.apellido,
                    correo: inv.correo
                });
                console.log(`  ⚠ SIN MAPEAR: ${inv.nombre} ${inv.apellido} (correo: ${inv.correo || 'N/A'})`);
            }
        }

        // Resumen final
        log.resumen.mapeados = uidsMapeados.size;
        log.resumen.sinMapear = log.sinMapear.length;
        log.resumen.errores = log.errores.length;
        log.resumen.nuevosMapeadosEnEstaEjecucion = nuevosMapeados;

        console.log('\n' + '='.repeat(60));
        console.log('RESUMEN DE MIGRACIÓN:');
        console.log(`  Total usuarios inventario: ${log.resumen.totalInventario}`);
        console.log(`  Total mapeados (incluye previos): ${log.resumen.mapeados}`);
        console.log(`  Nuevos mapeos en esta ejecución: ${nuevosMapeados}`);
        console.log(`  Sin mapear (requieren revisión manual): ${log.resumen.sinMapear}`);
        console.log(`  Errores: ${log.resumen.errores}`);
        console.log('='.repeat(60));

        if (log.sinMapear.length > 0) {
            console.log('\nUSUARIOS SIN MAPEAR (agregar manualmente en 003_user_mapping.sql):');
            log.sinMapear.forEach(u => {
                console.log(`  - Inventario UID ${u.inventario_uid}: ${u.nombre} ${u.apellido} (${u.correo || 'sin correo'})`);
            });
        }

        // Guardar log en archivo
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
        console.log(`\nLog guardado en: ${LOG_FILE}`);

    } catch (error) {
        console.error('ERROR CRÍTICO en la migración:', error.message);
        log.errores.push({ tipo: 'critico', error: error.message, stack: error.stack });
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
        process.exit(1);
    } finally {
        await seqHorarios.close();
        await seqInventario.close();
    }
}

// ============================================================
// FUNCIÓN: Crear tabla de mapeo si no existe
// ============================================================
async function crearTablaMapeo() {
    await seqInventario.query(`
        CREATE TABLE IF NOT EXISTS user_mapping (
            inventario_uid  INTEGER NOT NULL,
            horarios_uid    INTEGER NOT NULL,
            metodo_mapeo    VARCHAR(30) DEFAULT 'correo',
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (inventario_uid),
            UNIQUE (horarios_uid)
        )
    `);
    console.log('✓ Tabla user_mapping verificada/creada');
}

// ============================================================
// EJECUTAR
// ============================================================
ejecutarMigracion().catch(console.error);
