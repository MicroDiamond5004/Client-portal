import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post('/generate-preview', async (req: any, res: any) => {
  const { name, url, type } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Некорректные данные файла' });
  }

  const id = uuidv4();
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:title" content="${name}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${req.protocol}://${req.get('host')}/previews/${id}.html" />
  ${['.png', '.jpeg', '.jpg', '.webp', '.tif'].some((el) => name.includes(el)) ? `<meta property="og:image" content="${url}" />` : ''}
  <meta property="og:description" content="Файл для просмотра и скачивания" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${name}" />
  <meta name="twitter:description" content="Файл для просмотра и скачивания" />
  ${['.png', '.jpeg', '.jpg', '.webp', '.tif'].some((el) => name.includes(el)) ? `<meta name="twitter:image" content="${url}" />` : ''}
  <title>${name}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: #f9f9f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }

    .preview-container {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      max-width: 600px;
      width: 90%;
    }

    .preview-image {
      max-width: 100%;
      max-height: 400px;
      border-radius: 8px;
      object-fit: contain;
    }

    .file-title {
      margin-top: 16px;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .download-btn {
      margin-top: 20px;
      padding: 10px 20px;
      font-size: 1rem;
      border: none;
      background-color: #1976d2;
      color: white;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }

    .download-btn:hover {
      background-color: #115293;
    }

    .icon {
      font-size: 80px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="preview-container">
    ${
      ['.png', '.jpeg', '.jpg', '.webp', '.tif'].some((el) => name.includes(el))
        ? `<img src="${url}" alt="${name}" class="preview-image" />`
        : `<div class="icon">📄</div>`
    }
    <div class="file-title">${name}</div>
    <a href="${url}" download class="download-btn">Скачать</a>
  </div>
</body>
</html>
`;


  const filePath = path.join(__dirname, '..', '..', '..', 'public', 'previews', `${name.replaceAll(' ', '_').split('.')[0]}.html`);
  fs.writeFileSync(filePath, html);

  return res.json({
    id,
    previewUrl: `${req.protocol}://${req.get('host')}/previews/${name.replaceAll(' ', '_').split('.')[0]}.html`
  });
});

export default router;
