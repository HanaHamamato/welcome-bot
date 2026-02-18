const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("guildMemberAdd", member => {
  const channel = member.guild.channels.cache.get("1473353851305197870");

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("👋 Welcome!")
    .setDescription(`Hey ${member}, welcome to **${member.guild.name}** 💖`)
    .setColor(0xff69b4)
    .setImage("https://media.tenor.com/1iSR3yT5pWMAAAAC/anime-welcome.gif");

  channel.send({ embeds: [embed] });
});

client.login(process.env.TOKEN);

