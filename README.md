# SnowBear — AI Prompt Enhancer

SnowBear is a React + Express app that optimizes AI prompts using the Groq API. It includes a marketing landing page and a downloadable Chrome extension package.

## Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and add your API key:

```bash
copy .env.example .env.local
```

Edit `.env.local` and set `GROQ_API_KEYS` (comma-separated). Keys rotate automatically at 30 requests/minute each. Never commit this file.

3. Start the development server:

```bash
npm run dev
```

Open http://127.0.0.1:3000

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home with extension mockup |
| `/features` | All SnowBear features |
| `/pricing` | Free & Pro plans |
| `/privacy` | Privacy policy |
| `/auth` | Sign in / Sign up (Firebase) |

Enable **Google** sign-in in [Firebase Console](https://console.firebase.google.com) → Authentication → Sign-in method.

## Production

```bash
npm run build
NODE_ENV=production npm start
```

Set `ALLOWED_ORIGINS` to your production domain and run behind HTTPS (nginx, Caddy, etc.).

## Security

- API keys are server-side only — never exposed to the browser
- Rate limiting on all `/api` routes
- CORS restricted to configured origins (+ Chrome extensions)
- Input validation and request size limits
- Security headers (HSTS in production, nosniff, frame denial)
- Generic error messages in production (no internal stack traces)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Vite HMR |
| `npm run build` | Build frontend + bundle server |
| `npm start` | Run production server |
| `npm run lint` | TypeScript type check |