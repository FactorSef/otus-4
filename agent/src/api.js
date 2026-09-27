// Тонкий HTTP-клиент к серверу из директории server.
export const API_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const RESOURCES = {
  user: '/users',
  article: '/articles',
};

export async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return { ok: false, status: 0, data: { error: `API недоступен по адресу ${API_URL}: ${err.cause?.code ?? err.message}` } };
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}
