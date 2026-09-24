import test from "node:test";
import assert from "node:assert/strict";
import { buildSupportPrompt } from "../src/ai/support.js";

test("buildSupportPrompt keeps HelzerX Studio support identity and safety rules", () => {
  const prompt = buildSupportPrompt({
    guildName: "HelzerX Studio",
    categoryName: "Hosting Support",
    customerName: "Customer",
    history: [{ parts: [{ text: "Customer: My server is offline" }] }],
    latestMessage: "Can you check it?",
  });
  assert.match(prompt, /HelzerX Studio/);
  assert.match(prompt, /Never ask for passwords/);
  assert.match(prompt, /Latest customer message: Can you check it\?/);
  assert.match(prompt, /My server is offline/);
});

test("buildSupportPrompt prevents invented business information", () => {
  const prompt = buildSupportPrompt({
    guildName: "Test",
    categoryName: "Billing",
    customerName: "Customer",
    history: [],
    latestMessage: "Give me a refund",
  });
  assert.match(prompt, /Never invent prices, policies, refunds, credentials/);
  assert.match(prompt, /Use human staff for payment decisions/);
});