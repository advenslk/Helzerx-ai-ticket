import { InviteSnapshot, InviteStat } from "#db/Schema";
import { logger } from "#utils/logger";

export class InviteTracker {
  constructor(client) {
    this.client = client;
  }

  async syncGuild(guild) {
    try {
      const invites = await guild.invites.fetch();
      for (const invite of invites.values()) {
        const code = invite.code;
        const inviterId = invite.inviterId || null;
        const uses = Number(invite.uses || 0);
        const previous = await InviteSnapshot.findOne({ guildId: guild.id, code });

        if (!previous) {
          await InviteSnapshot.create({ guildId: guild.id, code, inviterId, uses, active: true });
          continue;
        }

        const delta = Math.max(0, uses - previous.uses);
        if (delta > 0 && inviterId) {
          await InviteStat.findOneAndUpdate(
            { guildId: guild.id, userId: inviterId },
            { $inc: { successfulInvites: delta }, $set: { updatedAt: new Date() } },
            { upsert: true, new: true },
          );
        }

        await InviteSnapshot.findOneAndUpdate(
          { guildId: guild.id, code },
          { $set: { inviterId, uses, active: true, updatedAt: new Date() } },
        );
      }
      return true;
    } catch (error) {
      logger.debug("Invites", "Could not sync invites for " + guild.id + ": " + error.message);
      return false;
    }
  }

  async onCreate(invite) {
    if (!invite.guildId) return;
    await InviteSnapshot.findOneAndUpdate(
      { guildId: invite.guildId, code: invite.code },
      { $set: { inviterId: invite.inviterId || null, uses: Number(invite.uses || 0), active: true, updatedAt: new Date() } },
      { upsert: true },
    );
  }

  async onDelete(invite) {
    if (!invite.guildId) return;
    await InviteSnapshot.findOneAndUpdate(
      { guildId: invite.guildId, code: invite.code },
      { $set: { active: false, updatedAt: new Date() } },
    );
  }

  async getUserInvites(guild, userId) {
    await this.syncGuild(guild);
    const stat = await InviteStat.findOne({ guildId: guild.id, userId }).lean();
    return { userId, successfulInvites: Number(stat?.successfulInvites || 0), tracked: Boolean(stat) };
  }
}
