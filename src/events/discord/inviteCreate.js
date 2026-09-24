export default {
  name: "inviteCreate",
  async execute({ eventArgs, client }) {
    const [invite] = eventArgs;
    await client.inviteTracker.onCreate(invite);
  },
};
