import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';
import { randomStyleRouter } from './routes/randomStyle.js';
import { isGeminiConfigured } from './gemini/client.js';
import { sendError } from './errors/apiErrors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '512kb' }));

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    sendError(res, 400, 'INVALID_JSON');
    return;
  }
  next(err);
});

app.get('/api/health', (_req, res) => {
  res.json({
    configured: isGeminiConfigured(),
  });
});

app.use('/api/chat', chatRouter);
app.use('/api/random-style', randomStyleRouter);

const stylePhotoDir = path.resolve(__dirname, '../../stylephoto');
app.use('/stylephoto', express.static(stylePhotoDir));

app.use('/api/*', (_req, res) => {
  sendError(res, 404, 'NOT_FOUND');
});

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).end();
  });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
