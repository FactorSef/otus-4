import { tool } from 'langchain';
import { z } from 'zod';
import { RESOURCES, request } from './api.js';

const entity = z.enum(['user', 'article']).describe('Тип сущности: "user" — пользователь, "article" — статья');
const id = z.number().int().positive().describe('Числовой id сущности');

const userFields = {
  username: z.string().min(1).optional().describe('user: имя пользователя, непустое и уникальное'),
  age: z.number().int().min(0).optional().describe('user: возраст, целое число >= 0'),
};
const articleFields = {
  title: z.string().min(1).optional().describe('article: заголовок, непустая строка'),
  text: z.string().optional().describe('article: текст статьи'),
  user_id: z.number().int().positive().optional().describe('article: id существующего пользователя-автора'),
};

const FIELDS = {
  user: ['username', 'age'],
  article: ['title', 'text', 'user_id'],
};

// Оставляет только поля, относящиеся к выбранной сущности, и переводит их в формат API.
function pickBody(kind, input) {
  const body = {};
  for (const key of FIELDS[kind]) {
    if (input[key] !== undefined) body[key === 'user_id' ? 'user' : key] = input[key];
  }
  return body;
}

function foreignFields(kind, input) {
  const other = kind === 'user' ? FIELDS.article : FIELDS.user;
  return other.filter((key) => input[key] !== undefined);
}

// Результат инструмента — строка JSON, которую модель читает как данные.
function format({ ok, status, data }) {
  return JSON.stringify(ok ? { ok, status, result: data } : { ok, status, error: data });
}

function invalid(message) {
  return JSON.stringify({ ok: false, status: 'invalid_arguments', error: message });
}

export const createEntity = tool(
  async ({ entity: kind, ...input }) => {
    const extra = foreignFields(kind, input);
    if (extra.length) return invalid(`Поля ${extra.join(', ')} не относятся к сущности ${kind}`);
    const missing = FIELDS[kind].filter((key) => input[key] === undefined);
    if (missing.length) return invalid(`Для создания ${kind} не хватает полей: ${missing.join(', ')}`);
    return format(await request('POST', RESOURCES[kind], pickBody(kind, input)));
  },
  {
    name: 'create_entity',
    description:
      'Создаёт новую сущность (POST). Для user обязательны username и age. ' +
      'Для article обязательны title, text и user_id (id существующего пользователя). ' +
      'Возвращает созданную запись с присвоенным id.',
    schema: z.object({ entity, ...userFields, ...articleFields }),
  },
);

export const getEntity = tool(
  async ({ entity: kind, id: entityId }) => format(await request('GET', `${RESOURCES[kind]}/${entityId}`)),
  {
    name: 'get_entity',
    description: 'Получает одну сущность по id (GET). Статья возвращается с вложенным объектом автора.',
    schema: z.object({ entity, id }),
  },
);

export const updateEntity = tool(
  async ({ entity: kind, id: entityId, ...input }) => {
    const extra = foreignFields(kind, input);
    if (extra.length) return invalid(`Поля ${extra.join(', ')} не относятся к сущности ${kind}`);
    const body = pickBody(kind, input);
    if (!Object.keys(body).length) return invalid('Не передано ни одного поля для обновления');
    return format(await request('PATCH', `${RESOURCES[kind]}/${entityId}`, body));
  },
  {
    name: 'update_entity',
    description:
      'Частично обновляет сущность по id (PATCH): меняются только переданные поля, остальные сохраняются. ' +
      'Для user можно менять username и age, для article — title, text и user_id.',
    schema: z.object({ entity, id, ...userFields, ...articleFields }),
  },
);

export const listEntities = tool(
  async ({ entity: kind, user_id }) => {
    if (user_id !== undefined && kind !== 'article') return invalid('Фильтр user_id доступен только для article');
    const query = user_id !== undefined ? `?user=${user_id}` : '';
    return format(await request('GET', `${RESOURCES[kind]}${query}`));
  },
  {
    name: 'list_entities',
    description:
      'Возвращает список всех сущностей типа (GET). Для article можно отфильтровать статьи одного автора через user_id. ' +
      'Используйте, чтобы найти id пользователя по имени или статьи по заголовку.',
    schema: z.object({
      entity,
      user_id: z.number().int().positive().optional().describe('article: вернуть только статьи этого пользователя'),
    }),
  },
);

export const tools = [createEntity, getEntity, updateEntity, listEntities];
