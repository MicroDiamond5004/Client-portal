// src/routes/subscriptionRouter.ts
import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const SUBSCRIPTIONS_DIR = path.join(__dirname, '..', '..', 'data', 'subscriptions');

// Ensure directory exists
if (!fs.existsSync(SUBSCRIPTIONS_DIR)) {
  fs.mkdirSync(SUBSCRIPTIONS_DIR, { recursive: true });
}

router.post('/save-subscription', (req: any, res: any) => {
  const { subscription, email } = req.body;

  if (!subscription || !email) {
    return res.status(400).json({ error: 'Необходимы email и subscription' });
  }

  const filePath = path.join(SUBSCRIPTIONS_DIR, `${email}.json`);
  fs.writeFile(filePath, JSON.stringify({...subscription, email}), (err) => {
    if (err) {
      console.error('Ошибка сохранения подписки:', err);
      return res.status(500).json({ error: 'Не удалось сохранить подписку' });
    }

    res.status(200).json({ success: true });
  });
});

export default router;
