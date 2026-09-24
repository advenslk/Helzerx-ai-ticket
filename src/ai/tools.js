import { config } from "#config/config";
import { VPSBotClient } from "#integrations/vpsClient";

const declaration = (name, description, properties = {}, required = []) => ({
  name,
  description,
  parameters: { type: "OBJECT", properties, required },
});

export const toolDeclarations = [
  declaration("get_user_invites", "Check the customer's tracked successful Discord invites. Use this before deciding invite reward eligibility.", {
    user_id: { type: "STRING", description: "Discord user ID of the customer." },
  }, ["user_id"]),
  declaration("get_vps_plans", "Get the currently configured VPS plans and their resources/durations.", {}),
  declaration("get_vps_nodes", "Get available VPS nodes and current capacity. Use this before provisioning so the agent can select a suitable node automatically.", {}),
  declaration("get_vps_operating_systems", "Get the operating systems supported by the VPS bot.", {}),
  declaration("create_vps", "Provision a VPS through the official HelzerX VPS bot. The application validates invites and plan eligibility. Do not ask the customer to select a node or OS unless the customer explicitly asks to choose.", {
    user_id: { type: "STRING", description: "Customer Discord user ID." },
    plan_id: { type: "STRING", description: "VPS plan ID." },
    node_id: { type: "STRING", description: "Optional node ID selected by the AI after checking capacity." },
    os_id: { type: "STRING", description: "Optional operating system ID selected by the AI." },
    name: { type: "STRING", description: "Optional VPS name." },
  }, ["user_id", "plan_id"]),
  declaration("get_user_vps", "List the customer's VPS instances.", {
    user_id: { type: "STRING", description: "Customer Discord user ID." },
  }, ["user_id"]),
  declaration("get_vps_status", "Read the status and details of one of the customer's VPS instances.", {
    vps_id: { type: "STRING", description: "VPS ID." },
  }, ["vps_id"]),
  declaration("start_vps", "Start one of the customer's VPS instances.", {
    vps_id: { type: "STRING", description: "VPS ID." },
  }, ["vps_id"]),
  declaration("stop_vps", "Stop one of the customer's VPS instances.", {
    vps_id: { type: "STRING", description: "VPS ID." },
  }, ["vps_id"]),
  declaration("restart_vps", "Restart one of the customer's VPS instances.", {
    vps_id: { type: "STRING", description: "VPS ID." },
  }, ["vps_id"]),
  declaration("get_vps_stats", "Read live resource statistics for one of the customer's VPS instances.", {
    vps_id: { type: "STRING", description: "VPS ID." },
  }, ["vps_id"]),
  declaration("get_vps_logs", "Read recent logs from one of the customer's VPS instances.", {
    vps_id: { type: "STRING", description: "VPS ID." },
  }, ["vps_id"]),
  declaration("delete_vps", "Permanently delete a customer's VPS. Never do this without explicit confirmation from the customer in the current conversation.", {
    vps_id: { type: "STRING", description: "VPS ID." },
    confirmed: { type: "BOOLEAN", description: "Must be true only after explicit customer confirmation." },
  }, ["vps_id", "confirmed"]),
  declaration("escalate_to_staff", "Hand the ticket to human staff when a staff-only action, payment decision, security issue, unresolved technical issue, or other human intervention is required.", {
    reason: { type: "STRING", description: "Short reason staff should see." },
    priority: { type: "STRING", description: "low, normal, high, or urgent." },
  }, ["reason"]),
];

const cleanVps = (vps) => ({
  id: vps.id,
  name: vps.name,
  status: vps.status,
  cpu_cores: vps.cpu_cores,
  ram_mb: vps.ram_mb,
  disk_gb: vps.disk_gb,
  image: vps.image,
  host_port: vps.host_port,
  node_id: vps.node_id,
  node_name: vps.node_name,
  os: vps.os,
  duration_days: vps.duration_days,
});

export function createToolExecutor({ client, message, ticket, category }) {
  const vps = new VPSBotClient();
  const userId = message.author.id;

  const ownedVps = async (vpsId) => {
    const list = await vps.getVps(vpsId);
    if (!list?.vps || String(list.vps.owner_id) !== String(userId)) throw new Error("That VPS does not belong to this customer.");
    return list.vps;
  };

  return {
    async get_user_invites(args) {
      if (String(args.user_id) !== String(userId)) throw new Error("Customer identity mismatch.");
      return client.inviteTracker.getUserInvites(message.guild, userId);
    },

    async get_vps_plans() {
      if (vps.enabled) return vps.plans();
      return { plans: config.invitePlans };
    },

    async get_vps_nodes() {
      if (!vps.enabled) throw new Error("VPS bot integration is not configured.");
      return vps.nodes();
    },

    async get_vps_operating_systems() {
      if (!vps.enabled) throw new Error("VPS bot integration is not configured.");
      return vps.operatingSystems();
    },

    async create_vps(args) {
      if (!config.ai.autoActions) throw new Error("Automatic VPS actions are disabled.");
      if (String(args.user_id) !== String(userId)) throw new Error("Customer identity mismatch.");

      const plan = config.invitePlans.find((item) => item.id === args.plan_id);
      if (!plan) throw new Error("Unknown invite VPS plan.");

      const inviteInfo = await client.inviteTracker.getUserInvites(message.guild, userId);
      if (inviteInfo.successfulInvites < plan.requiredInvites) {
        return { success: false, reason: "not_eligible", invites: inviteInfo.successfulInvites, required: plan.requiredInvites };
      }

      if (!vps.enabled) throw new Error("VPS bot integration is not configured.");

      const nodeData = await vps.nodes();
      const availableNodes = (nodeData.nodes || []).filter((node) => node.available);
      if (!availableNodes.length) return { success: false, reason: "no_capacity" };

      const node = availableNodes.find((item) => item.id === args.node_id)
        || [...availableNodes].sort((a, b) => (b.available_ram_mb || 0) - (a.available_ram_mb || 0))[0];

      const osData = await vps.operatingSystems();
      const systems = osData.operating_systems || [];
      const os = systems.find((item) => item.id === args.os_id)
        || systems.find((item) => item.id === plan.defaultOs)
        || systems.find((item) => item.image === "ubuntu:24.04")
        || systems[0];

      if (!os) return { success: false, reason: "no_operating_system" };

      const created = await vps.createVps({
        owner_id: userId,
        name: args.name || ("Helzer-" + userId),
        cpu_cores: plan.cpuCores,
        ram_mb: plan.ramMb,
        disk_gb: plan.diskGb,
        duration_days: plan.durationDays,
        node_id: node.id,
        image: os.image,
      });

      await client.db.updateTicket(ticket.ticketId, {
        "aiStats.lastActionAt": new Date(),
        "aiStats.intent": "vps_provisioning",
      });

      return { success: true, plan, selected_node: node, selected_os: os, vps: cleanVps(created.vps) };
    },

    async get_user_vps(args) {
      if (String(args.user_id) !== String(userId)) throw new Error("Customer identity mismatch.");
      if (!vps.enabled) throw new Error("VPS bot integration is not configured.");
      return vps.listForUser(userId);
    },

    async get_vps_status(args) { return { vps: cleanVps(await ownedVps(args.vps_id)) }; },
    async start_vps(args) { return { vps: cleanVps((await vps.action(args.vps_id, "start")).vps) }; },
    async stop_vps(args) { return { vps: cleanVps((await vps.action(args.vps_id, "stop")).vps) }; },
    async restart_vps(args) { return { vps: cleanVps((await vps.action(args.vps_id, "restart")).vps) }; },
    async get_vps_stats(args) { await ownedVps(args.vps_id); return vps.stats(args.vps_id); },
    async get_vps_logs(args) { await ownedVps(args.vps_id); return vps.logs(args.vps_id); },

    async delete_vps(args) {
      if (args.confirmed !== true) throw new Error("Explicit confirmation is required before deleting a VPS.");
      await ownedVps(args.vps_id);
      throw new Error("VPS deletion is intentionally staff-controlled in the AI support layer.");
    },

    async escalate_to_staff(args) {
      const priority = ["low", "normal", "high", "urgent"].includes(args.priority) ? args.priority : "normal";
      await client.db.updateTicket(ticket.ticketId, {
        "aiStats.escalated": true,
        "aiStats.humanTakeover": true,
        "aiStats.priority": priority,
        "aiStats.intent": "human_escalation",
        "aiStats.lastActionAt": new Date(),
      });
      const roles = category?.supportRoles || [];
      const mention = roles.length ? roles.map((roleId) => "<@&" + roleId + ">").join(" ") : "Support staff";
      await message.channel.send({
        content: mention + " — AI escalated this ticket: " + String(args.reason).slice(0, 800),
        allowedMentions: { roles },
      });
      return { escalated: true, priority, reason: args.reason };
    },
  };
}
