import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const stmt = {
  all: db.prepare('SELECT id, username, age FROM users ORDER BY id'),
  byId: db.prepare('SELECT id, username, age FROM users WHERE id = ?'),
  insert: db.prepare('INSERT INTO users (username, age) VALUES (?, ?)'),
  update: db.prepare('UPDATE users SET username = ?, age = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM users WHERE id = ?'),
};

function validate(body, partial = false) {
  const errors = [];
  const { username, age } = body ?? {};
  if (!partial || username !== undefined) {
    if (typeof username !== 'string' || !username.trim()) errors.push('username must be a non-empty string');
  }
  if (!partial || age !== undefined) {
    if (!Number.isInteger(age) || age < 0) errors.push('age must be a non-negative integer');
  }
  return errors;
}

function handleUniqueError(err, res) {
  if (String(err.message).includes('UNIQUE')) {
    res.status(409).json({ error: 'username already exists' });
    return true;
  }
  return false;
}

router.get('/', (req, res) => {
  res.json(stmt.all.all());
});

router.get('/:id', (req, res) => {
  const user = stmt.byId.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.post('/', (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });
  try {
    const { lastInsertRowid } = stmt.insert.run(req.body.username.trim(), req.body.age);
    res.status(201).json(stmt.byId.get(lastInsertRowid));
  } catch (err) {
    if (!handleUniqueError(err, res)) throw err;
  }
});

// PUT — полная замена, PATCH — частичное обновление
for (const method of ['put', 'patch']) {
  router[method]('/:id', (req, res) => {
    const existing = stmt.byId.get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    const errors = validate(req.body, method === 'patch');
    if (errors.length) return res.status(400).json({ errors });
    const next = { ...existing, ...req.body };
    try {
      stmt.update.run(next.username.trim(), next.age, existing.id);
      res.json(stmt.byId.get(existing.id));
    } catch (err) {
      if (!handleUniqueError(err, res)) throw err;
    }
  });
}

router.delete('/:id', (req, res) => {
  const { changes } = stmt.remove.run(req.params.id);
  if (!changes) return res.status(404).json({ error: 'User not found' });
  res.status(204).end();
});

export default router;
