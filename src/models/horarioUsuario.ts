import { DataTypes } from 'sequelize';
import sequelize from '../database/connection';
import { User } from './user';

export const HorarioUsuario = sequelize.define(
    "HorarioUsuario",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Uid: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: "Uid" } },
        diaSemana: { type: DataTypes.INTEGER, allowNull: false }, // 1=Lunes, 2=Martes, ..., 6=Sábado
        jornadaMinutos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 510 }, // 8:30 = 510 min de trabajo
        almuerzoMinutos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 }, // 1 hora almuerzo
        activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        horaEntrada: { type: DataTypes.STRING(5), allowNull: true, defaultValue: '07:30' }, // Hora de entrada permitida HH:mm
    },
    {
        timestamps: false,
        paranoid: false,
        tableName: "horario_usuario",
        indexes: [
            {
                unique: true,
                fields: ['Uid', 'diaSemana'],
            },
        ],
    }
);

User.hasMany(HorarioUsuario, { foreignKey: "Uid", as: "horarios" });
HorarioUsuario.belongsTo(User, { foreignKey: "Uid", as: "usuario" });

// Jornada estándar por defecto (L-V: 510 min trabajo + 60 min almuerzo, Sáb: 240 min + 0 almuerzo)
const JORNADA_ESTANDAR: Record<number, { jornadaMinutos: number; almuerzoMinutos: number }> = {
    1: { jornadaMinutos: 510, almuerzoMinutos: 60 }, // Lunes
    2: { jornadaMinutos: 510, almuerzoMinutos: 60 }, // Martes
    3: { jornadaMinutos: 510, almuerzoMinutos: 60 }, // Miércoles
    4: { jornadaMinutos: 510, almuerzoMinutos: 60 }, // Jueves
    5: { jornadaMinutos: 510, almuerzoMinutos: 60 }, // Viernes
    6: { jornadaMinutos: 240, almuerzoMinutos: 0 },  // Sábado
};

/**
 * Obtiene la jornada configurada para un usuario en un día específico.
 * Si no tiene horario personalizado, devuelve la jornada estándar.
 * @returns { jornadaMinutos, almuerzoMinutos, totalRestar } donde totalRestar = jornadaMinutos + almuerzoMinutos
 */
export async function getJornadaUsuario(uid: number | string, diaSemana: number): Promise<{ jornadaMinutos: number; almuerzoMinutos: number; totalRestar: number }> {
    // Domingo (0) no tiene jornada
    if (diaSemana === 0) {
        return { jornadaMinutos: 0, almuerzoMinutos: 0, totalRestar: 0 };
    }

    const horario = await HorarioUsuario.findOne({
        where: { Uid: uid, diaSemana },
    });

    if (horario) {
        const jornada = horario.getDataValue('jornadaMinutos');
        const almuerzo = horario.getDataValue('almuerzoMinutos');
        const activo = horario.getDataValue('activo');
        if (!activo) {
            return { jornadaMinutos: 0, almuerzoMinutos: 0, totalRestar: 0 };
        }
        return { jornadaMinutos: jornada, almuerzoMinutos: almuerzo, totalRestar: jornada + almuerzo };
    }

    // Fallback: jornada estándar
    const estandar = JORNADA_ESTANDAR[diaSemana];
    if (estandar) {
        return { jornadaMinutos: estandar.jornadaMinutos, almuerzoMinutos: estandar.almuerzoMinutos, totalRestar: estandar.jornadaMinutos + estandar.almuerzoMinutos };
    }

    return { jornadaMinutos: 0, almuerzoMinutos: 0, totalRestar: 0 };
}

/**
 * Genera los horarios estándar para un usuario (L-V + Sáb).
 */
export async function generarHorariosEstandar(uid: number): Promise<void> {
    const existentes = await HorarioUsuario.findAll({ where: { Uid: uid } });
    if (existentes.length > 0) return; // Ya tiene horarios configurados

    const registros = Object.entries(JORNADA_ESTANDAR).map(([dia, config]) => ({
        Uid: uid,
        diaSemana: parseInt(dia, 10),
        jornadaMinutos: config.jornadaMinutos,
        almuerzoMinutos: config.almuerzoMinutos,
        horaEntrada: '07:30',
        activo: true,
    }));

    await HorarioUsuario.bulkCreate(registros);
}
