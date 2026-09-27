import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createAgent, toolCallLimitMiddleware, AIMessage, ToolMessage } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { tools } from './tools.js';
import { SYSTEM_PROMPT } from './prompt.js';
import { API_URL } from './api.js';

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
  // Предохранитель от зацикливания: не больше 15 вызовов инструментов на один запрос
  middleware: [toolCallLimitMiddleware({ runLimit: 15, exitBehavior: 'end' })],
});

// История диалога хранится в памяти процесса
let messages = [];

async function ask(question) {
  const from = messages.length;
  const result = await agent.invoke({ messages: [...messages, { role: 'user', content: question }] });
  messages = result.messages;

  for (const message of messages.slice(from)) {
    if (AIMessage.isInstance(message)) {
      for (const call of message.tool_calls ?? []) {
        console.log(`  → ${call.name}(${JSON.stringify(call.args)})`);
      }
    } else if (ToolMessage.isInstance(message)) {
      const text = String(message.content);
      console.log(`  ← ${text.length > 200 ? `${text.slice(0, 200)}…` : text}`);
    }
  }

  const last = messages.at(-1);
  return last?.text || '(агент не вернул текстового ответа)';
}

const oneShot = process.argv.slice(2).join(' ').trim();
if (oneShot) {
  console.log(await ask(oneShot));
} else {
  console.log(`Агент подключён к API ${API_URL}. Введите запрос, «exit» — выход.`);
  const rl = readline.createInterface({ input, output });
  while (true) {
    const question = (await rl.question('\n> ')).trim();
    if (!question) continue;
    if (['exit', 'quit', 'выход'].includes(question.toLowerCase())) break;
    try {
      console.log(`\n${await ask(question)}`);
    } catch (err) {
      console.error(`Ошибка: ${err.message}`);
    }
  }
  rl.close();
}
