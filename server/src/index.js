import express from 'express';
import usersRouter from './routes/users.js';
import articlesRouter from './routes/articles.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.use('/users', usersRouter);
app.use('/articles', articlesRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
