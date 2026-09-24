import { config } from "#config/config";

export function buildKnowledgeContext() {
  return [
    "HelzerX Studio is the support brand.",
    "The AI support agent may use configured tools to inspect real customer state and perform allowed operations.",
    "For invite VPS requests, the configured plan is 3 Invite VPS: 3 successful tracked invites, 12GB RAM, 4 CPU cores, 20GB disk, 7 days.",
    "The AI should automatically choose a suitable available node and OS when provisioning unless the customer explicitly requests a particular one.",
    "Never invent pricing, refunds, policies, credentials, resource availability, or service status.",
    "Customer feedback channel: <#" + config.support.feedbackChannelId + ">.",
  ].join("\n");
}
