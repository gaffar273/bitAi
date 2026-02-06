import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getSQL } from '../services/DatabaseService';
import { generateId } from '../utils/blockchain';

const router = Router();

// Use memory storage to get file buffer, then save to DB
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /api/files/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const sql = getSQL();
        if (!sql) {
            return res.status(503).json({ success: false, error: 'Database not connected' });
        }

        // Convert buffer to base64 for storage in TEXT column
        const base64Data = req.file.buffer.toString('base64');
        const fileId = generateId();

        await sql`
            INSERT INTO file_uploads (id, filename, data, mime_type, size)
            VALUES (${fileId}, ${req.file.originalname}, ${base64Data}, ${req.file.mimetype}, ${req.file.size})
        `;

        console.log(`[Files] Uploaded ${req.file.originalname} to database (ID: ${fileId})`);

        res.json({
            success: true,
            data: {
                id: fileId, // Return ID instead of path
                filename: req.file.originalname,
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('[Files] Upload error:', error);
        res.status(500).json({ success: false, error: 'Upload failed' });
    }
});

export default router;
