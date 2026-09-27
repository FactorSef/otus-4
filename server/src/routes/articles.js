import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const SELECT = `
  SELECT a.id, a.title, a.text, u.id AS user_id, u.username, u.age
  FROM articles a JOIN users u ON u.id = a.user_id
`;

const stmt = {
  all: db.prepare(`${SELECT} ORDER BY a.id`),
  byUser: db.prepare(`${SELECT} WHERE a.user_id = ? ORDER BY a.id`),
  byId: db.prepare(`${SELECT} WHERE a.id = ?`),
  raw: db.prepare('SELECT id, title, text, user_id FROM articles WHERE id = ?'),
  userExists: db.prepare('SELECT 1 FROM users WHERE id = ?'),
  insert: db.prepare('INSERT INTO articles (title, text, user_id) VALUES (?, ?, ?)'),
  update: db.prepare('UPDATE articles SET title = ?, text = ?, user_id = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM articles WHERE id = ?'),
};

// Статья отдаётся с вложенным объектом автора
const toArticle = ({ id, title, text, user_id, username, age }) => ({
  id,
  title,
  text,
  user: { id: user_id, username, age },
});

function validate(body, partial = false) {
  const errors = [];
  const { title, text, user } = body ?? {};
  if (!partial || title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) errors.push('title must be a non-empty string');
  }
  if (!partial || text !== undefined) {
    if (typeof text !== 'string') errors.push('text must be a string');
  }
  if (!partial || user !== undefined) {
    if (!Number.isInteger(user)) errors.push('user must be an integer user id');
    else if (!stmt.userExists.get(user)) errors.push(`user with id ${user} does not exist`);
  }
  return errors;
}

router.get('/', (req, res) => {
  const rows = req.query.user ? stmt.byUser.all(req.query.user) : stmt.all.all();
  res.json(rows.map(toArticle));
});

router.get('/:id', (req, res) => {
  const row = stmt.byId.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Article not found' });
  res.json(toArticle(row));
});

router.post('/', (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const { title, text, user } = req.body;
  const { lastInsertRowid } = stmt.insert.run(title.trim(), text, user);
  res.status(201).json(toArticle(stmt.byId.get(lastInsertRowid)));
});

// PUT — полная замена, PATCH — частичное обновление
for (const method of ['put', 'patch']) {
  router[method]('/:id', (req, res) => {
    const existing = stmt.raw.get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Article not found' });
    const errors = validate(req.body, method === 'patch');
    if (errors.length) return res.status(400).json({ errors });
    const { title = existing.title, text = existing.text, user = existing.user_id } = req.body;
    stmt.update.run(title.trim(), text, user, existing.id);
    res.json(toArticle(stmt.byId.get(existing.id)));
  });
}

router.delete('/:id', (req, res) => {
  const { changes } = stmt.remove.run(req.params.id);
  if (!changes) return res.status(404).json({ error: 'Article not found' });
  res.status(204).end();
});

export default router;
