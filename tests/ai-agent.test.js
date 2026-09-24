import test from "node:test";
import assert from "node:assert/strict";
import { toolDeclarations } from "../src/ai/tools.js";
import { buildKnowledgeContext } from "../src/ai/knowledge.js";
import { config } from "../src/config/config.js";

test("AI tool registry exposes real support operations without shell access", () => {
  const names = toolDeclarations.map((tool) => tool.name);
  assert.ok(names.includes("get_user_invites"));
  assert.ok(names.includes("create_vps"));
  assert.ok(names.includes("get_vps_nodes"));
  assert.ok(names.includes("get_vps_operating_systems"));
  assert.ok(names.includes("restart_vps"));
  assert.ok(!names.includes("docker_exec"));
  assert.ok(!names.includes("shell"));
});

test("invite VPS plan is explicit and deterministic", () => {
  const plan = config.invitePlans.find((item) => item.id === "3-invite-vps");
  assert.equal(plan.requiredInvites, 3);
  assert.equal(plan.ramMb, 12288);
  assert.equal(plan.cpuCores, 4);
  assert.equal(plan.diskGb, 20);
  assert.equal(plan.durationDays, 7);
});

test("knowledge context tells the agent to automate node and OS selection", () => {
  const knowledge = buildKnowledgeContext();
  assert.match(knowledge, /automatically choose a suitable available node and OS/);
  assert.match(knowledge, /feedback channel/i);
});
