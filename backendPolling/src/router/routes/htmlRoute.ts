import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/previews/:id.html', (req, res) => {
  const filePath = path.join(__dirname, '..', '..', '..', 'public', 'previews', `${req.params.id}.html`);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Файл не найден');
  }
});

export default router;