import { parseId } from '../utils/parseId'
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";

import { Area } from "../models/area";
import { Role } from "../models/role";
import { User } from "../models/user";
import { Permiso } from "../models/permisos";
import { Novedad, NovedadHistorico, Registro, Sumatoria, HistoricoHorasExtras } from "../models/time";

// Registro de usuario con asignación de rol
export const register = async (req: Request, res: Response): Promise<any> => {
  const { Uid, name, lastName, password, email, Rid, Aid, salario, empresa, documentoIdentificacion, cargo, fondoPension, fondoCesantias, fechaIngreso } = req.body;

  // Verificar si el usuario ya existe
  const userOne = await User.findOne({ where: { email: email } });
  if (userOne) {
    return res.status(400).json({
      msg: `El usuario ya existe con el email: ${email}`,
    });
  }

  // Verificar si el rol existe
  const role = await Role.findByPk(parseId(Rid));
  if (!role) {
    return res.status(400).json({
      msg: `El rol con ID ${Rid} no existe`,
    });
  }

  // Hashear la contraseña
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Crear usuario con el rol asignado
    const newUser = await User.create({
      Uid,
      name,
      lastName,
      password: passwordHash,
      email,
      status: 1,
      Rid: Rid, // Asociar rol al usuario
      Aid: Aid,
      salario: salario || 0,
      empresa: empresa || 'AP',
      documentoIdentificacion: documentoIdentificacion || '',
      cargo: cargo || '',
      fondoPension: fondoPension || 'PORVENIR',
      fondoCesantias: fondoCesantias || 'PORVENIR',
      fechaIngreso: fechaIngreso || null,
    });

    res.status(200).json({
      message: "Usuario registrado con éxito",
      user: newUser,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al registrar el usuario",
      message: err.message || err,
    });
  }
};

// Login con validación de rol
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { password, email } = req.body;

    // Validar que se envíen email y password
    if (!email || !password) {
      return res.status(400).json({
        msg: "Email y contraseña son requeridos",
      });
    }

    // Buscar usuario por email
    const user: any = await User.findOne({
      where: { email },
      include: [
        { model: Role, as: "role" },
        { model: Area, as: "area" },
      ], // Incluir rol en la consulta
    });

    if (!user) {
      return res.status(400).json({
        msg: `Usuario no existe con el correo ${email}`,
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        msg: "Contraseña incorrecta",
      });
    }

    // Crear token con datos del usuario y su rol
    const token = jwt.sign(
      {
        userId: user.Uid,
        email: user.email,
        role: user.role.Rname, // Agregar nombre del rol al token
        area: user.area.Aname,
        Aid: user.Aid,
        name: user.name,
        lastname: user.lastName,
        correolider: user.area.correolider,
      },
      process.env.SECRET_KEY || "ptrYxZyMticytOs8eqKW17niMy8RR1JS",
      {
        expiresIn: "30m",
      }
    );

    res.json({
      msg: "Inicio de sesión exitoso",
      token,
      role: user.role.Rname,
      userId: user.Uid,
      area: user.area.Aname,
      Aid: user.Aid,
      name: user.name,
      lastname: user.lastName,
      documentoIdentificacion: user.documentoIdentificacion || '',
      correolider: user.area.correoLider,
    });
  } catch (error: any) {
    console.error('ERROR EN LOGIN:', error);
    return res.status(500).json({
      msg: "Error en el servidor al intentar iniciar sesión",
      error: error.message || error,
    });
  }
};
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.password = passwordHash;
    await user.save();

    res.status(200).json({ msg: "Contraseña actualizada con éxito" });
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar la contraseña", error });
  }
};

// Obtener todos los usuarios
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const users = await User.findAll({
      include: [
        { model: Role, as: "role" },
        { model: Area, as: "area" },
      ], // Incluir rol en la consulta
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener los usuarios", error });
  }
};

export const getListUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const user = await User.findAll({
      attributes: ["Uid", "name", "lastName"],
    });
    const userJS = user.map((us) => ({
      Uid: us.Uid,
      nombre: `${us.name} ${us.lastName}`,
    }));
    res.status(200).json(userJS);
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener los usuarios0", error });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<any> => {
  const { Uid } = req.params;
  const { name, lastName, email, password, Rid, Aid, salario, empresa, documentoIdentificacion, cargo, fondoPension, fondoCesantias, fechaIngreso } = req.body;
  try {
    const user = await User.findByPk(parseId(Uid));

    if (!user) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    if (Rid) {
      const role = await Role.findByPk(parseId(Rid));
      if (!role) {
        return res.status(404).json({ msg: `El role con ID ${Rid} no existe` });
      }
    }
    if (Aid) {
      const area = await Area.findByPk(parseId(Aid));
      if (!area) {
        return res.status(404).json({ msg: `El area con ID ${Aid} no existe` });
      }
    }
    user.name = name || user.name;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.Rid = Rid || user.Rid;
    user.Aid = Aid || user.Aid;
    user.salario = salario !== undefined ? salario : user.salario;
    user.empresa = empresa || user.empresa;
    user.documentoIdentificacion = documentoIdentificacion || user.documentoIdentificacion;
    user.cargo = cargo || user.cargo;
    user.fondoPension = fondoPension || user.fondoPension;
    user.fondoCesantias = fondoCesantias || user.fondoCesantias;
    user.fechaIngreso = fechaIngreso !== undefined ? fechaIngreso : user.fechaIngreso;

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      user.password = passwordHash;
    }
    await user.save();
    res.status(200).json({ msg: "Usuario Actualizado", user });
  } catch (error) {
    console.error("Error al actualizar el usuario", error);
    res.status(500).json({ msg: "Error al actualizar el usuario", error });
  }
};

export const deleteUserById = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Uid } = req.params;

  console.log("=== INICIANDO deleteUserById ===");
  console.log("Uid recibido:", Uid);

  if (!Uid) {
    console.log("❌ ERROR: Uid no proporcionado");
    return res.status(400).json({ msg: "ID de usuario requerido" });
  }

  try {
    console.log("🔍 Buscando usuario...");
    const user = await User.findByPk(parseId(Uid));

    if (!user) {
      console.log("❌ Usuario no encontrado");
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    console.log("✅ Usuario encontrado:", {
      Uid: user.Uid,
      email: user.email,
      name: user.name,
    });

    // Verificar que sequelize esté disponible
    if (!User.sequelize) {
      console.error("❌ Error: Sequelize no está configurado");
      return res.status(500).json({ 
        msg: "Error de configuración de base de datos" 
      });
    }

    // Iniciar transacción para asegurar consistencia
    const transaction = await User.sequelize.transaction();

    try {
      console.log("🧹 Eliminando registros relacionados...");

      // 1. Eliminar participantes de asistencia
      const { ParticipanteAsistencia } = await import('../models/asistencia');
      const participantesDeleted = await ParticipanteAsistencia.destroy({
        where: { usuarioId: Uid },
        transaction,
      });
      console.log(`✅ Participantes asistencia eliminados: ${participantesDeleted}`);

      // 2. Eliminar registros de asistencia donde es facilitador
      const { RegistroAsistencia } = await import('../models/asistencia');
      const asistenciasDeleted = await RegistroAsistencia.destroy({
        where: { facilitadorId: Uid },
        transaction,
      });
      console.log(`✅ Registros asistencia eliminados: ${asistenciasDeleted}`);

      // 3. Eliminar alertas
      const { Alert } = await import('../models/alert');
      const alertsDeleted = await Alert.destroy({
        where: { Uid: Uid },
        transaction,
      });
      console.log(`✅ Alertas eliminadas: ${alertsDeleted}`);

      // 4. Eliminar reservaciones
      const { Reservation } = await import('../models/reservation');
      const reservationsDeleted = await Reservation.destroy({
        where: { Uid: Uid },
        transaction,
      });
      console.log(`✅ Reservaciones eliminadas: ${reservationsDeleted}`);

      // 5. Eliminar registros de tiempo (Hid = Uid)
      const registrosDeleted = await Registro.destroy({
        where: { Hid: Uid },
        transaction,
      });
      console.log(`✅ Registros de tiempo eliminados: ${registrosDeleted}`);

      // 6. Eliminar historico de horas extras (Sid = Uid)
      const historicoDeleted = await HistoricoHorasExtras.destroy({
        where: { Sid: Uid },
        transaction,
      });
      console.log(`✅ Historico horas extras eliminado: ${historicoDeleted}`);

      // 7. Eliminar sumatoria (Sid = Uid)
      const sumatoriaDeleted = await Sumatoria.destroy({
        where: { Sid: Uid },
        transaction,
      });
      console.log(`✅ Sumatoria eliminada: ${sumatoriaDeleted}`);

      // 7. Eliminar novedades (usando Nid)
      const novedadesDeleted = await Novedad.destroy({
        where: { Nid: Uid },
        transaction,
      });
      console.log(`✅ Novedades eliminadas: ${novedadesDeleted}`);

      // 8. Eliminar historial de novedades (usando Nid)
      const novedadHistoricoDeleted = await NovedadHistorico.destroy({
        where: { Nid: Uid },
        transaction,
      });
      console.log(`✅ Historial de novedades eliminado: ${novedadHistoricoDeleted}`);

      // 9. Eliminar permisos
      const permissionsDeleted = await Permiso.destroy({
        where: { Uid: Uid },
        transaction,
      });
      console.log(`✅ Permisos eliminados: ${permissionsDeleted}`);

      // 10. Eliminar accesos a actas de recarga
      const { ActaRecargaAcceso } = await import('../models/actaRecargaAcceso');
      const accesosDeleted = await ActaRecargaAcceso.destroy({
        where: { usuarioId: Uid },
        transaction,
      });
      console.log(`✅ Accesos actas recarga eliminados: ${accesosDeleted}`);

      // 11. Finalmente eliminar el usuario
      console.log("🗑️ Eliminando usuario...");
      await user.destroy({ transaction });

      // Confirmar transacción
      await transaction.commit();

      console.log(
        "✅ Usuario y todos los registros relacionados eliminados exitosamente"
      );
      res.status(200).json({
        msg: "Usuario eliminado con éxito",
        details: "Se eliminaron todos los registros relacionados",
        eliminatedRecords: {
          novedades: novedadesDeleted,
          novedadHistorico: novedadHistoricoDeleted,
          permisos: permissionsDeleted,
        },
      });
    } catch (transactionError) {
      // Revertir transacción en caso de error
      console.error("❌ Error en transacción, revirtiendo cambios...");
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error: any) {
    console.error("❌ ERROR:", error);
    console.error("Detalles del error:", error.message);
    console.error("Stack trace:", error.stack);

    // Verificar si es un error de clave foránea
    if (error.name === "SequelizeForeignKeyConstraintError") {
      console.error("🔗 Error de clave foránea detectado");
      return res.status(400).json({
        msg: "No se puede eliminar el usuario porque tiene registros relacionados",
        error: "Foreign key constraint",
      });
    }

    // Error de conexión a la base de datos
    if (error.name === "ConnectionError") {
      console.error("🔌 Error de conexión a la base de datos");
      return res.status(500).json({
        msg: "Error de conexión a la base de datos",
        error: "Database connection error",
      });
    }

    // Error de columna no existente
    if (error.name === "SequelizeDatabaseError" && error.message.includes("does not exist")) {
      console.error("🗂️ Error de columna no existente");
      return res.status(500).json({
        msg: "Error en la estructura de la base de datos",
        error: "Column does not exist",
      });
    }

    res.status(500).json({
      msg: "Error al eliminar el usuario",
      error: error.message,
    });
  }
};

// Buscar usuarios por nombre o cédula
export const searchUsers = async (req: Request, res: Response): Promise<any> => {
  const { query } = req.query;

  try {
    if (!query || query.toString().trim() === '') {
      return res.status(400).json({
        msg: "Debe proporcionar un término de búsqueda"
      });
    }

    const searchTerm = `%${query}%`;

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: searchTerm } },
          { lastName: { [Op.iLike]: searchTerm } },
          { documentoIdentificacion: { [Op.iLike]: searchTerm } },
          { email: { [Op.iLike]: searchTerm } }
        ],
        status: 1 // Solo usuarios activos
      },
      include: [
        { model: Area, as: 'area' },
        { model: Role, as: 'role' }
      ],
      limit: 10,
      order: [['name', 'ASC']]
    });

    res.status(200).json(users);

  } catch (error: any) {
    console.error("Error al buscar usuarios:", error);
    res.status(500).json({
      msg: "Error al buscar usuarios",
      error: error.message
    });
  }
};
