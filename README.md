# HelzerX Studio — AI Ticket Bot

A production-focused Discord ticket system for **HelzerX Studio**, now with Gemini-powered support responses.

## Features
- Discord Components V2 ticket panels
- MongoDB ticket persistence
- Ticket lifecycle: create, close, reopen, delete
- User add/remove controls
- Staff roles and category-specific permissions
- Ticket ratings and transcripts
- **Gemini AI support inside open tickets**
- Recent ticket history is supplied to Gemini for contextual replies
- AI pauses when a configured support-role member has recently replied
- AI avoids inventing prices, policies, account data, refunds, credentials, or staff-only actions
- AI escalates requests that require human staff
- Secrets are kept in environment variables

## Gemini setup

HelzerX Studio uses Google's official `@google/genai` SDK. The default model is `gemini-3.8-flash`.

Create a `.env` file:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
MONGODB_URI=mongodb://localhost:27017/helzerx-studio-tickets

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash
AI_ENABLED=true
AI_COOLDOWN_MS=2500
AI_HISTORY_LIMIT=12
AI_STAFF_SILENCE_MS=300000

NODE_ENV=production
DEBUG=false
```

Install and run:
```bash
npm install
npm run test
npm start
```

## How the AI works
1. Confirms the channel belongs to an open ticket.
2. Loads the ticket category and configured support roles.
3. Reads a small recent window of the ticket conversation.
4. Avoids answering while a support-role member has recently replied.
5. Sends the conversation and latest customer message to Gemini.
6. Posts the response back into the ticket.
7. Records basic AI interaction statistics in MongoDB.

The AI is designed to sound natural and helpful, but it does not pretend to be a human if asked directly.

## Safety
Never place Discord tokens, Gemini API keys, MongoDB passwords, payment credentials, or private keys in source code. Rotate any credential that has previously been committed to a repository.

## Development
```bash
npm run test
npm run test:ai
npm run format
```

Built for **HelzerX Studio**.