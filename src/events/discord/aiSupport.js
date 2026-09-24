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
    if (ticket.aiStats?.humanTakeover) return;

    const panel = await client.db.getPanel(ticket.panelId);
    const category = panel?.categories?.find((item) => item.categoryId === ticket.categoryId);
    if (!category || category.settings?.aiEnabled === false) return;

    const now = Date.now();
    const last = cooldowns.get(message.channel.id) || 0;
    if (now - last < config.ai.cooldownMs) return;

    const recent = await message.channel.messages.fetch({
      limit: Math.min(config.ai.historyLimit, 25),
    });
    const ordered = [...recent.values()].reverse();

    const staffRecentlyActive = ordered.some(
      (item) =>
        item.id !== message.id &&
        !item.author.bot &&
        isStaffMessage(item, category) &&
        now - item.createdTimestamp < config.ai.staffSilenceMs,
    );
    if (staffRecentlyActive) return;

    cooldowns.set(message.channel.id, now);
    await message.channel.sendTyping();

    try {
      const result = await generateSupportReply({
        guildName: message.guild.name,
        categoryName: category.name,
        customerName: message.member?.displayName || message.author.username,
        history: formatHistory(ordered),
        latestMessage: message.content,
        model: category.settings?.aiModel || guildConfig?.aiSupport?.model || config.ai.model,
        client,
        message,
        ticket,
        category,
      });

      if (!result.text) return;

      await message.channel.send({
        content: result.text.slice(0, 1900),
        allowedMentions: { parse: [] },
      });

      await client.db.updateTicket(ticket.ticketId, {
        "aiStats.messages": (ticket.aiStats?.messages || 0) + 1,
        "aiStats.toolCalls": (ticket.aiStats?.toolCalls || 0) + result.toolCalls,
        "aiStats.lastInteractionAt": new Date(),
      });
    } catch (error) {
      logger.error("AI Support", "Failed to process ticket " + ticket.ticketId, error);
      cooldowns.delete(message.channel.id);
    }
  },
};
