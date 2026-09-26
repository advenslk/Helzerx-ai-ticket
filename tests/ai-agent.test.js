import test from "node:test";
import assert from "node:assert/strict";
import { toolDeclarations } from "../src/ai/tools.js";
import { buildKnowledgeContext } from "../src/ai/knowledge.js";
import { config } from "../src/config/config.js";

test("AI tool registry exposes full business support without shell access", () => {
  const names = toolDeclarations.map((tool) => tool.name);

  for (const name of [
    "get_service_catalog",\n    "get_service",\n    "request_service_action",\n    "get_customer_profile",
    "get_customer_services",
    "get_customer_orders",
    "get_invoice",
    "get_payment",
    "create_payment_link",
    "get_customer_domains",
    "get_customer_minecraft",
    "get_customer_ai_agents",
    "get_user_invites",
    "create_vps",
    "restart_vps",
    "escalate_to_staff",
  ]) {
    assert.ok(names.includes(name), name);
  }

  assert.ok(!names.includes("docker_exec"));
  assert.ok(!names.includes("shell"));
  assert.ok(!names.includes("ssh_exec"));
});

test("invite VPS plan is explicit and deterministic", () => {
  const plan = config.invitePlans.find((item) => item.id === "3-invite-vps");
  assert.equal(plan.requiredInvites, 3);
  assert.equal(plan.ramMb, 12288);
  assert.equal(plan.cpuCores, 4);
  assert.equal(plan.diskGb, 20);
  assert.equal(plan.durationDays, 7);
});

test("knowledge context describes the full HelzerX support surface", () => {
  const knowledge = buildKnowledgeContext();
  assert.match(knowledge, /central support and operations agent/i);
  assert.match(knowledge, /billing, payments, domains, Minecraft hosting, AI agents/i);
  assert.match(knowledge, /automatically choose a suitable available node and OS/i);
  assert.match(knowledge, /feedback channel/i);
});
