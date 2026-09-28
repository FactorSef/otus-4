import { z } from 'zod';

export const ACTIONS = [
  'create_user',
  'create_article',
  'get_user',
  'get_article',
  'update_user',
  'update_article',
  'list_users',
  'list_articles',
  'delete_user',
  'delete_article',
  'multiple',
  'unknown',
];

// Итоговый ответ агента на каждый запрос
export const AgentResponse = z.object({
  status: z
    .enum(['success', 'failed'])
    .describe('success — запрошенное действие выполнено; failed — не выполнено (ошибка API, отказ, не хватает данных)'),
  action: z
    .enum(ACTIONS)
    .describe(
      'Действие, которое просил пользователь (а не вспомогательный поиск id). ' +
        'multiple — если в запросе несколько независимых действий; unknown — запрос не относится к API блога.',
    ),
  data: z
    .any()
    .describe(
      'При success — результат из API: созданная или обновлённая запись, запись по id или массив записей. ' +
        'При multiple — объект, где ключ — действие, значение — его результат. ' +
        'При failed — объект { reason: "причина или вопрос пользователю на русском", details?: ошибка из API }.',
    ),
});

export function failed(action, reason, details) {
  return { status: 'failed', action, data: details === undefined ? { reason } : { reason, details } };
}
