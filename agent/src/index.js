import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createAgent, toolCallLimitMiddleware, toolStrategy, AIMessage, ToolMessage } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { tools } from './tools.js';
import { SYSTEM_PROMPT } from './prompt.js';
import { API_URL } from './api.js';
import { AgentResponse, failed } from './response.js';

const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'http://localhost:1234/v1';

// LM Studio отдаёт OpenAI-совместимый API; ключ он не проверяет, но клиенту нужен непустой
const model = new ChatOpenAI({
  model: process.env.LLM_MODEL ?? 'qwen/qwen3.6-35b-a3b',
  apiKey: process.env.LLM_API_KEY ?? 'lm-studio',
  configuration: { baseURL: LLM_BASE_URL },
  temperature: 0,
  maxTokens: 8000,
});

const agent = createAgent({
  model,
  tools,
  systemPrompt: SYSTEM_PROMPT,
  // Итог возвращается вызовом служебного инструмента и проверяется схемой; при несовпадении модель повторяет попытку
  responseFormat: toolStrategy(AgentResponse),
  // Предохранитель от зацикливания: не больше 15 вызовов инструментов на один запрос
  middleware: [toolCallLimitMiddleware({ runLimit: 15, exitBehavior: 'end' })],
});

// История диалога хранится в памяти процесса
let messages = [];

const TOOL_NAMES = new Set(tools.map((t) => t.name));

// Трассировка вызовов идёт в stderr, чтобы в stdout был только JSON-ответ
function trace(newMessages) {
  for (const message of newMessages) {
    if (AIMessage.isInstance(message)) {
      for (const call of message.tool_calls ?? []) {
        if (TOOL_NAMES.has(call.name)) console.error(`  → ${call.name}(${JSON.stringify(call.args)})`);
      }
    } else if (ToolMessage.isInstance(message) && TOOL_NAMES.has(message.name)) {
      const text = String(message.content);
      console.error(`  ← ${text.length > 200 ? `${text.slice(0, 200)}…` : text}`);
    }
  }
}

async function ask(question) {
  const from = messages.length;
  const result = await agent.invoke({ messages: [...messages, { role: 'user', content: question }] });
  messages = result.messages;
  trace(messages.slice(from));

  // Структурированного ответа нет, если сработал лимит вызовов инструментов
  return result.structuredResponse ?? failed('unknown', 'Агент не сформировал ответ: превышен лимит вызовов инструментов');
}

// Модель может вернуть поля в любом порядке — выводим всегда status, action, data
const print = ({ status, action, data }) => console.log(JSON.stringify({ status, action, data }, null, 2));

const oneShot = process.argv.slice(2).join(' ').trim();
if (oneShot) {
  try {
    print(await ask(oneShot));
  } catch (err) {
    print(failed('unknown', `Ошибка агента: ${err.message}`));
    process.exitCode = 1;
  }
} else {
  console.error(`Агент подключён к API ${API_URL}. Введите запрос, «exit» — выход.`);
  const rl = readline.createInterface({ input, output });
  while (true) {
    const question = (await rl.question('\n> ')).trim();
    if (!question) continue;
    if (['exit', 'quit', 'выход'].includes(question.toLowerCase())) break;
    try {
      print(await ask(question));
    } catch (err) {
      print(failed('unknown', `Ошибка агента: ${err.message}`));
    }
  }
  rl.close();
}
