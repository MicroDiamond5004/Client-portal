import path from "path";
import fs from "fs";

const cookiesDir = path.join(__dirname, "cookies");

interface CookieFile {
  token: string;
  cookie: string;
}

// Создаём папку, если её нет
function ensureCookiesDir(): void {
  if (!fs.existsSync(cookiesDir)) {
    fs.mkdirSync(cookiesDir);
  }
}

// Генерируем новый файл tokenN.json
function generateFileName(): string {
  ensureCookiesDir();

  const files = fs.readdirSync(cookiesDir);
  const tokenFiles = files.filter(name => /^token\d+\.json$/.test(name));
  const numbers = tokenFiles.map(f => parseInt(f.match(/^token(\d+)\.json$/)![1], 10));
  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return `token${nextNumber}.json`;
}

// Сохранить token + cookie в файл
export function saveCookieAndToken(token: string, cookie: string): string {
  ensureCookiesDir();

  const fileName = generateFileName();
  const filePath = path.join(cookiesDir, fileName);

  const data: CookieFile = {
    token,
    cookie
  };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

  return fileName;
}

// Найти cookie по токену
export function getCookieByToken(token: string): string | null {
  ensureCookiesDir();

  const files = fs.readdirSync(cookiesDir);

  for (const file of files) {
    const filePath = path.join(cookiesDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content) as CookieFile;

    if (json.token === token) {
      return json.cookie;
    }
  }

  return null;
}

// Удалить файл по токену
export function deleteCookieByToken(token: string): boolean {
  ensureCookiesDir();

  const files = fs.readdirSync(cookiesDir);

  for (const file of files) {
    const filePath = path.join(cookiesDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content) as CookieFile;

    if (json.token === token) {
      fs.unlinkSync(filePath);
      return true;
    }
  }

  return false;
}
