# Примеры команд

## 01

Вызов:
```
npm start -- "покажи все статьи bob"
```

Ответ:
```
{
  "status": "success",
  "action": "list_articles",
  "data": [
    {
      "id": 3,
      "title": "Установка React.js с помощью Vite",
      "text": "Для работы понадобится Node.js версии 18 или новее. Проверить версию: node -v.\n1. Создайте проект: npm create vite@latest my-app -- --template react\n2. Перейдите в папку проекта: cd my-app\n3. Установите зависимости: npm install\n4. Запустите dev-сервер: npm run dev\n5. Откройте http://localhost:5173 — вы увидите стартовую страницу React.\nДля production-сборки выполните npm run build, готовые файлы появятся в папке dist.",
      "user": {
        "id": 2,
        "username": "bob",
        "age": 30
      }
    },
    {
      "id": 4,
      "title": "Установка React.js в существующий проект",
      "text": "Если проект уже есть и нужно просто подключить React:\n1. Установите пакеты: npm install react react-dom\n2. ДляTypeScript добавьте типы: npm install -D @types/react @types/react-dom\n3. Настройте сборщик на обработку JSX (например, @vitejs/plugin-react для Vite или babel-loader с @babel/preset-react для webpack).\n4. Добавьте в HTML контейнер: <div id=\"root\"></div>\n5. Смонтируйте приложение:\n   import { createRoot } from 'react-dom/client';\n   createRoot(document.getElementById('root')).render(<App />);\nПосле этого можно постепенно переносить части интерфейса на React-компоненты.",
      "user": {
        "id": 2,
        "username": "bob",
        "age": 30
      }
    }
  ]
}
```

## 02

Вызов:
```
npm start -- "добавь пользователя с именем Игнат"
```

Ответ:
```
{
  "status": "failed",
  "action": "create_user",
  "data": {
    "reason": "Для создания пользователя необходим возраст. Пожалуйста, укажите возраст для пользователя Игнат."
  }
}
```

## 03

Вызов:
```
npm start -- "добавь пользователя с именем Игнат, 25 лет"
```

Ответ:
```
{
  "status": "success",
  "action": "create_user",
  "data": {
    "id": 4,
    "username": "Игнат",
    "age": 25
  }
}
```

## 04

Вызов:
```
npm start -- "сколько будет 2+2*2?"
```

Ответ:
```
{
  "status": "failed",
  "action": "unknown",
  "data": {
    "reason": "Я могу помогать только с управлением пользователями и статьями в блоге. Математические вычисления я не выполняю."
  }
}
```

## 05

Вызов:
```
npm start -- "удали игната"
```

Ответ:
```
{
  "status": "failed",
  "action": "delete_user",
  "data": {
    "reason": "Удаление пользователей невозможно. У меня нет такой операции."
  }
}
```