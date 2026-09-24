export default {
  name: "inviteDelete",
  async execute({ eventArgs, client }) {
    const [invite] = eventArgs;
    await client.inviteTracker.onDelete(invite);
  },
};
