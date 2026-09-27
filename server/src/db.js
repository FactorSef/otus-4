import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dbPath =
  process.env.DB_PATH ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data.sqlite');

export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    NOT NULL UNIQUE,
    age      INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS articles (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    title   TEXT    NOT NULL,
    text    TEXT    NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
  );
`);

const DEFAULT_USERS = [
  { username: 'alice', age: 25 },
  { username: 'bob', age: 30 },
  { username: 'charlie', age: 35 },
];

const DEFAULT_ARTICLES = [
  {
    author: 'alice',
    title: 'Рецепт узбекского плова',
    text:
      'Ингредиенты: 1 кг баранины, 1 кг риса девзира, 1 кг моркови, 3 луковицы, 200 мл масла, 2 головки чеснока, зира, барбарис, соль.\n' +
      '1. Раскалите масло в казане и обжарьте нарезанную кольцами луковицу.\n' +
      '2. Добавьте мясо кусками и обжарьте до корочки.\n' +
      '3. Выложите морковь соломкой и жарьте 10 минут, не перемешивая с мясом.\n' +
      '4. Добавьте специи, соль, залейте горячей водой и тушите 40 минут — это зирвак.\n' +
      '5. Выложите промытый рис ровным слоем, залейте водой на 2 см выше риса.\n' +
      '6. Когда вода впитается, воткните чеснок, соберите рис горкой, накройте крышкой и томите 30 минут на слабом огне.',
  },
  {
    author: 'alice',
    title: 'Рецепт куриного супа с лапшой',
    text:
      'Ингредиенты: 500 г курицы, 2 л воды, 1 морковь, 1 луковица, 3 картофелины, 100 г домашней лапши, лавровый лист, соль, перец, зелень.\n' +
      '1. Залейте курицу холодной водой, доведите до кипения и снимите пену.\n' +
      '2. Варите бульон 40 минут на слабом огне, затем достаньте курицу и разберите мясо.\n' +
      '3. Добавьте в бульон нарезанный картофель и варите 10 минут.\n' +
      '4. Обжарьте лук с морковью и отправьте в суп вместе с мясом.\n' +
      '5. Всыпьте лапшу, добавьте лавровый лист, соль и перец, варите ещё 5 минут.\n' +
      '6. Подавайте с рубленой зеленью.',
  },
  {
    author: 'bob',
    title: 'Установка React.js с помощью Vite',
    text:
      'Для работы понадобится Node.js версии 18 или новее. Проверить версию: node -v.\n' +
      '1. Создайте проект: npm create vite@latest my-app -- --template react\n' +
      '2. Перейдите в папку проекта: cd my-app\n' +
      '3. Установите зависимости: npm install\n' +
      '4. Запустите dev-сервер: npm run dev\n' +
      '5. Откройте http://localhost:5173 — вы увидите стартовую страницу React.\n' +
      'Для production-сборки выполните npm run build, готовые файлы появятся в папке dist.',
  },
  {
    author: 'bob',
    title: 'Установка React.js в существующий проект',
    text:
      'Если проект уже есть и нужно просто подключить React:\n' +
      '1. Установите пакеты: npm install react react-dom\n' +
      '2. Для TypeScript добавьте типы: npm install -D @types/react @types/react-dom\n' +
      '3. Настройте сборщик на обработку JSX (например, @vitejs/plugin-react для Vite или babel-loader с @babel/preset-react для webpack).\n' +
      '4. Добавьте в HTML контейнер: <div id="root"></div>\n' +
      '5. Смонтируйте приложение:\n' +
      "   import { createRoot } from 'react-dom/client';\n" +
      "   createRoot(document.getElementById('root')).render(<App />);\n" +
      'После этого можно постепенно переносить части интерфейса на React-компоненты.',
  },
  {
    author: 'charlie',
    title: 'Рыбалка для начинающих: с чего начать',
    text:
      'Лучшее время для рыбалки — раннее утро и вечер, когда рыба активнее всего кормится.\n' +
      '1. Выберите водоём: для первого раза подойдёт пруд или спокойная река с известным клёвом.\n' +
      '2. Начните с поплавочной удочки — это самая простая снасть.\n' +
      '3. Возьмите несколько видов наживки: червя, опарыша, хлеб или кукурузу.\n' +
      '4. Прикормите место за 20–30 минут до ловли.\n' +
      '5. Следите за поплавком и подсекайте, когда он уверенно уходит под воду.\n' +
      'Не забудьте узнать местные правила рыболовства и сроки нерестового запрета.',
  },
  {
    author: 'charlie',
    title: 'Как выбрать спиннинг',
    text:
      'При выборе спиннинга обращайте внимание на четыре параметра.\n' +
      '1. Длина: 1,8–2,1 м — для ловли с лодки и на малых реках, 2,4–2,7 м — для дальних забросов с берега.\n' +
      '2. Тест — диапазон веса приманок. Ультралайт (до 7 г) — окунь и форель, лайт/медиум (5–25 г) — универсальный вариант, хэви (от 30 г) — щука и сом.\n' +
      '3. Строй: быстрый строй точнее передаёт поклёвку и подходит для джига, медленный лучше гасит рывки рыбы.\n' +
      '4. Материал: углепластик лёгкий и чувствительный, стеклопластик прочнее и дешевле.\n' +
      'Для первого спиннинга подойдёт модель длиной 2,4 м с тестом 5–25 г и быстрым строем.',
  },
];

// Seed defaults only into empty tables, so deleted records don't reappear on restart.
const isEmpty = (table) => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count === 0;

if (isEmpty('users')) {
  const insert = db.prepare('INSERT INTO users (username, age) VALUES (?, ?)');
  for (const { username, age } of DEFAULT_USERS) insert.run(username, age);
}

if (isEmpty('articles')) {
  const findUser = db.prepare('SELECT id FROM users WHERE username = ?');
  const insert = db.prepare('INSERT INTO articles (title, text, user_id) VALUES (?, ?, ?)');
  for (const { author, title, text } of DEFAULT_ARTICLES) {
    const user = findUser.get(author);
    if (user) insert.run(title, text, user.id);
  }
}
