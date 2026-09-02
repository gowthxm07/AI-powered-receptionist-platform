import { createApp } from './app';

const app = createApp();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
