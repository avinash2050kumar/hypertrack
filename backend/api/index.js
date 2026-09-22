// Vercel function: every request is rewritten here (see vercel.json) and served by the Express app.
export { app as default } from '../dist/serverless.js';
