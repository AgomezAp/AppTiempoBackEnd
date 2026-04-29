import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Multer config para subida de fotos de inventario
 * Guarda en public/uploads/inventario/{subfolder}/
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Subfolder extraído del fieldname: fotos_{tipo} → tipo
        const subfolder = req.body?.tipo || 'general';
        const dir = path.join('public', 'uploads', 'inventario', subfolder);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `inv_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes'));
    }
};

export const uploadInventario = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

/**
 * Genera la URL pública de una foto subida
 */
export function getPhotoUrl(filename: string, subfolder: string): string {
    const baseUrl = process.env.API_URL || 'https://api.horariosap.com';
    return `${baseUrl}/uploads/inventario/${subfolder}/${filename}`;
}
