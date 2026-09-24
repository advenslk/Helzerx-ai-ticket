import { config } from "#config/config";
import { generateSupportReply, formatHistory } from "#ai/support";
import { logger } from "#utils/logger";

const cooldowns = new Map();

const isStaffMessage = (message, category) =>
  category?.supportRoles?.some((roleId) => message.member?.roles?.cache?.has(roleId)) || false;

export default {
  name: "messageCreate",

  async execute({ eventArgs, client }) {
    const [message] = eventArgs;
    if (!message.guild || message.author.bot || !message.channel?.isTextBased()) return;
    if (!config.ai.enabled || !config.ai.apiKey) return;

    const guildConfig = await client.db.getGuild(message.guild.id);
    if (guildConfig?.aiSupport?.enabled === false) return;

    const ticket = await client.db.getTicketByChannel(message.channel.id);
    if (!ticket || ticket.status !== "open") return;

    const panel = await client.db.getPanel(ticket.panelId);
    const category = panel?.categories?.find((c) => c.categoryId === ticket.categoryId);
    if (!category) return;

    const key = message.channel.id;
    const now = Date.now();
    if (cooldowns.has(key) && now - cooldowns.get(key) < config.ai.cooldownMs) return;

    const recent = await message.channel.messages.fetch({ limit: Math.min(config.ai.historyLimit, 25) });
    const ordered = [...recent.values()].reverse();

    const staffRecentlyActive = ordered.some(
      (m) =>
        m.id !== message.id &&
        !m.author.bot &&
        isStaffMessage(m, category) &&
        now - m.createdTimestamp < config.ai.staffSilenceMs,
    );
    if (staffRecentlyActive) return;

    cooldowns.set(key, now);
    await message.channel.sendTyping();

    try {
      const history = formatHistory(ordered);
      const reply = await generateSupportReply({
        guildName: message.guild.name,
        categoryName: category.name,
        customerName: message.member?.displayName || message.author.username,
        history,
        latestMessage: message.content,
        model: category.settings?.aiModel || guildConfig?.aiSupport?.model || config.ai.model,
      });

      if (!reply) return;

      await message.channel.send({
        content: reply.slice(0, 1900),
        allowedMentions: { parse: [] },
      });

      await client.db.updateTicket(ticket.ticketId, {
        "aiStats.messages": (ticket.aiStats?.messages || 0) + 1,
        "aiStats.lastInteractionAt": new Date(),
      });
    } catch (error) {
      logger.error("AI Support", `Failed to respond in ticket ${ticket.ticketId}`, error);
    }
  },
};