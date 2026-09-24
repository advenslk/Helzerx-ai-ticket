import dotenv from "dotenv";
dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN || process.env.token,
  clientId: process.env.DISCORD_CLIENT_ID || process.env.clientID,
  prefix: process.env.PREFIX || ".",

  environment: process.env.NODE_ENV || "production",

  database: {
    url: process.env.MONGODB_URI || process.env.mongodbURL,
  },

  ai: {
    enabled: process.env.AI_ENABLED !== "false",
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    cooldownMs: Number(process.env.AI_COOLDOWN_MS || 2500),
    historyLimit: Number(process.env.AI_HISTORY_LIMIT || 12),
    staffSilenceMs: Number(process.env.AI_STAFF_SILENCE_MS || 5 * 60 * 1000),
  },

  debug: process.env.DEBUG === "true",

  links: {
    supportServer: process.env.SUPPORT_SERVER_URL || "",
    github: "https://github.com/advenslk/Helzerx-ai-ticket",
    invite: process.env.BOT_INVITE_URL || "",
  },

  branding: {
    name: "HelzerX Studio",
    product: "HelzerX Studio AI Support",
    watermark: "HelzerX Studio",
  },

  version: "3.0.0",
};
