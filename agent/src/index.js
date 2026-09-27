import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createAgent, toolCallLimitMiddleware, AIMessage, ToolMessage } from 'langchain';
import { ChatAnthropic } from '@langchain/anthropic';
import { tools } from './tools.js';
import { SYSTEM_PROMPT } from './prompt.js';
import { API_URL } from './api.js';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Не задан ANTHROPIC_API_KEY. Укажите его в окружении или в agent/.env');
  process.exit(1);
}

const model = new ChatAnthropic({
  model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-5',
  maxTokens: 16000,
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
