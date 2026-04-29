import nodemailer from 'nodemailer';

/**
 * Transporter reutilizable (lazy init)
 */
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }
    return _transporter;
}

const frontendUrl = () => process.env.FRONTEND_URL || 'https://erp.andrespublicidadtg.com';

// ============================================================
// Firma de acta de DISPOSITIVOS
// ============================================================
export async function enviarCorreoFirma(
    destinatario: string,
    nombreReceptor: string,
    token: string,
    dispositivos: any[],
    comentarios?: string
): Promise<void> {
    const enlace = `${frontendUrl()}/firmar/${token}`;
    const listaItems = dispositivos.map(d =>
        `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${d.tipo || d.categoria || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${d.marca || ''} ${d.modelo || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${d.serial || 'N/A'}</td>
        </tr>`
    ).join('');

    await getTransporter().sendMail({
        from: `"Andrés Publicidad - Inventario" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: 'Firma requerida: Acta de Entrega de Dispositivos',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1e88e5;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
            <h2>Acta de Entrega - Dispositivos</h2>
          </div>
          <div style="background:#f9f9f9;padding:20px;border:1px solid #ddd;border-top:none;">
            <p>Estimado(a) <strong>${nombreReceptor}</strong>,</p>
            <p>Se le están haciendo entrega de los siguientes dispositivos. Por favor firme el acta haciendo clic en el botón de abajo.</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <thead>
                <tr style="background:#e3f2fd;">
                  <th style="padding:8px;border:1px solid #ddd;">Tipo</th>
                  <th style="padding:8px;border:1px solid #ddd;">Marca / Modelo</th>
                  <th style="padding:8px;border:1px solid #ddd;">Serial</th>
                </tr>
              </thead>
              <tbody>${listaItems}</tbody>
            </table>
            ${comentarios ? `<p><strong>Observaciones:</strong> ${comentarios}</p>` : ''}
            <div style="text-align:center;margin:25px 0;">
              <a href="${enlace}" style="background:#1e88e5;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-size:16px;">
                Firmar Acta de Entrega
              </a>
            </div>
            <p style="color:#666;font-size:12px;">Este enlace es válido por 7 días.</p>
          </div>
        </div>`
    });
}

// ============================================================
// Firma de acta de CONSUMIBLES
// ============================================================
export async function enviarCorreoFirmaConsumible(
    destinatario: string,
    nombreReceptor: string,
    numeroActa: string,
    token: string,
    tipoInventarioCodigo: string
): Promise<void> {
    const enlace = `${frontendUrl()}/firmar-consumible/${token}`;
    const tipoLabel = tipoInventarioCodigo === 'aseo' ? 'Aseo' :
        tipoInventarioCodigo === 'papeleria' ? 'Papelería' :
        tipoInventarioCodigo === 'botiquin' ? 'Botiquín' :
        tipoInventarioCodigo === 'dotacion' ? 'Dotación' : tipoInventarioCodigo;

    await getTransporter().sendMail({
        from: `"Andrés Publicidad - Inventario" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: `Firma requerida: Acta ${numeroActa} - ${tipoLabel}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#43a047;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
            <h2>Acta de Entrega - ${tipoLabel}</h2>
            <p>${numeroActa}</p>
          </div>
          <div style="background:#f9f9f9;padding:20px;border:1px solid #ddd;border-top:none;">
            <p>Estimado(a) <strong>${nombreReceptor}</strong>,</p>
            <p>Se han preparado artículos de <strong>${tipoLabel}</strong> para su entrega. Por favor firme el acta de entrega.</p>
            <div style="text-align:center;margin:25px 0;">
              <a href="${enlace}" style="background:#43a047;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-size:16px;">
                Firmar Acta ${numeroActa}
              </a>
            </div>
            <p style="color:#666;font-size:12px;">Este enlace es válido por 7 días.</p>
          </div>
        </div>`
    });
}

// ============================================================
// Firma de acta de MOBILIARIO
// ============================================================
export async function enviarCorreoFirmaMobiliario(
    destinatario: string,
    nombreReceptor: string,
    token: string,
    muebles: { nombre: string; categoria: string; cantidad: number; unidad: string }[],
    observaciones?: string
): Promise<void> {
    const enlace = `${frontendUrl()}/firmar-mobiliario/${token}`;
    const listaMuebles = muebles.map(m =>
        `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${m.nombre}</td>
          <td style="padding:8px;border:1px solid #ddd;">${m.categoria || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${m.cantidad} ${m.unidad || 'und.'}</td>
        </tr>`
    ).join('');

    await getTransporter().sendMail({
        from: `"Andrés Publicidad - Inventario" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: 'Firma requerida: Acta de Entrega de Mobiliario',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#f57c00;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
            <h2>Acta de Entrega - Mobiliario</h2>
          </div>
          <div style="background:#f9f9f9;padding:20px;border:1px solid #ddd;border-top:none;">
            <p>Estimado(a) <strong>${nombreReceptor}</strong>,</p>
            <p>Se le hace entrega del siguiente mobiliario. Por favor firme el acta.</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <thead>
                <tr style="background:#fff3e0;">
                  <th style="padding:8px;border:1px solid #ddd;">Artículo</th>
                  <th style="padding:8px;border:1px solid #ddd;">Categoría</th>
                  <th style="padding:8px;border:1px solid #ddd;">Cantidad</th>
                </tr>
              </thead>
              <tbody>${listaMuebles}</tbody>
            </table>
            ${observaciones ? `<p><strong>Observaciones:</strong> ${observaciones}</p>` : ''}
            <div style="text-align:center;margin:25px 0;">
              <a href="${enlace}" style="background:#f57c00;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-size:16px;">
                Firmar Acta de Mobiliario
              </a>
            </div>
            <p style="color:#666;font-size:12px;">Este enlace es válido por 7 días.</p>
          </div>
        </div>`
    });
}

export async function enviarActaMobiliarioFirmada(
    destinatarios: string[],
    nombreReceptor: string,
    muebles: any[],
    fecha: Date
): Promise<void> {
    await getTransporter().sendMail({
        from: `"Andrés Publicidad - Inventario" <${process.env.EMAIL_USER}>`,
        to: destinatarios.join(','),
        subject: 'Acta de Mobiliario Firmada Exitosamente',
        html: `<p>El acta de mobiliario de <strong>${nombreReceptor}</strong> fue firmada el ${fecha.toLocaleDateString('es-CO')}.</p>`
    });
}

// ============================================================
// Correo DEVOLUCIÓN de dispositivos
// ============================================================
export async function enviarCorreoDevolucion(
    destinatario: string,
    nombreReceptor: string,
    token: string,
    dispositivos: any[],
    observaciones?: string
): Promise<void> {
    const enlace = `${frontendUrl()}/firmar-devolucion/${token}`;
    const listaItems = dispositivos.map(d =>
        `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${d.tipo || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${d.marca || ''} ${d.modelo || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${d.serial || 'N/A'}</td>
        </tr>`
    ).join('');

    await getTransporter().sendMail({
        from: `"Andrés Publicidad - Inventario" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: 'Firma requerida: Acta de Devolución de Dispositivos',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#e53935;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
            <h2>Acta de Devolución</h2>
          </div>
          <div style="background:#f9f9f9;padding:20px;border:1px solid #ddd;border-top:none;">
            <p>Estimado(a) <strong>${nombreReceptor}</strong>,</p>
            <p>Se solicita su firma para confirmar la devolución de los siguientes dispositivos.</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
              <thead>
                <tr style="background:#ffebee;">
                  <th style="padding:8px;border:1px solid #ddd;">Tipo</th>
                  <th style="padding:8px;border:1px solid #ddd;">Equipo</th>
                  <th style="padding:8px;border:1px solid #ddd;">Serial</th>
                </tr>
              </thead>
              <tbody>${listaItems}</tbody>
            </table>
            ${observaciones ? `<p><strong>Observaciones:</strong> ${observaciones}</p>` : ''}
            <div style="text-align:center;margin:25px 0;">
              <a href="${enlace}" style="background:#e53935;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-size:16px;">
                Firmar Acta de Devolución
              </a>
            </div>
            <p style="color:#666;font-size:12px;">Este enlace es válido por 7 días.</p>
          </div>
        </div>`
    });
}

export async function enviarConfirmacionDevolucion(
    destinatarios: string[],
    nombreEntrega: string,
    dispositivos: any[],
    fecha: Date
): Promise<void> {
    await getTransporter().sendMail({
        from: `"Andrés Publicidad - Inventario" <${process.env.EMAIL_USER}>`,
        to: destinatarios.join(','),
        subject: 'Devolución de dispositivos completada',
        html: `<p>La devolución de dispositivos de <strong>${nombreEntrega}</strong> fue completada el ${fecha.toLocaleDateString('es-CO')}.</p>`
    });
}

// ============================================================
// Confirmación de firma de acta de DISPOSITIVOS
// ============================================================
export async function enviarActaFirmada(
    destinatarios: string[],
    nombreReceptor: string,
    dispositivos: any[],
    fecha: Date
): Promise<void> {
    await getTransporter().sendMail({
        from: `"Andrés Publicidad - Inventario" <${process.env.EMAIL_USER}>`,
        to: destinatarios.join(','),
        subject: 'Acta de Dispositivos Firmada Exitosamente',
        html: `<p>El acta de entrega de dispositivos de <strong>${nombreReceptor}</strong> fue firmada el ${fecha.toLocaleDateString('es-CO')}.</p>`
    });
}

// ============================================================
// Notificación de rechazo de acta de DISPOSITIVOS
// ============================================================
export async function enviarNotificacionRechazo(
    destinatario: string,
    nombreReceptor: string,
    motivo: string
): Promise<void> {
    await getTransporter().sendMail({
        from: `"Andrés Publicidad - Inventario" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: 'Acta de Entrega Rechazada',
        html: `<p>El acta de entrega de <strong>${nombreReceptor}</strong> fue rechazada.</p><p><strong>Motivo:</strong> ${motivo}</p>`
    });
}
