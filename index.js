require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");
const ms = require("ms");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = "1473276487758254261";
const WELCOME_CHANNEL_ID = "1473353851305197870";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const warnings = new Map();

client.once("clientReady", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [

    // BAN
    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Ban a user")
      .addUserOption(o => o.setName("user").setRequired(true).setDescription("User"))
      .addStringOption(o => o.setName("duration").setDescription("Example: 10m, 1h, 1d")),

    new SlashCommandBuilder()
      .setName("unban")
      .setDescription("Unban a user")
      .addUserOption(o => o.setName("user").setRequired(true).setDescription("User")),

    // KICK
    new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Kick a user")
      .addUserOption(o => o.setName("user").setRequired(true).setDescription("User")),

    // MUTE
    new SlashCommandBuilder()
      .setName("mute")
      .setDescription("Mute (timeout) a user")
      .addUserOption(o => o.setName("user").setRequired(true).setDescription("User"))
      .addStringOption(o => o.setName("duration").setRequired(true).setDescription("Example: 10m, 1h")),

    new SlashCommandBuilder()
      .setName("unmute")
      .setDescription("Unmute a user")
      .addUserOption(o => o.setName("user").setRequired(true).setDescription("User")),

    // WARN
    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Warning system")
      .addSubcommand(sub =>
        sub.setName("add")
          .setDescription("Add warning")
          .addUserOption(o => o.setName("user").setRequired(true).setDescription("User"))
          .addStringOption(o => o.setName("reason").setRequired(true).setDescription("Reason"))
      )
      .addSubcommand(sub =>
        sub.setName("remove")
          .setDescription("Remove specific warning")
          .addUserOption(o => o.setName("user").setRequired(true).setDescription("User"))
          .addIntegerOption(o => o.setName("warning").setRequired(true).setDescription("Warning number to remove"))
      ),

    new SlashCommandBuilder()
      .setName("warnings")
      .setDescription("Show user warnings")
      .addUserOption(o => o.setName("user").setRequired(true).setDescription("User")),

    // SAY
    new SlashCommandBuilder()
      .setName("say")
      .setDescription("Bot says something")
      .addStringOption(o => o.setName("message").setRequired(true).setDescription("Message"))
      .addStringOption(o => o.setName("image").setDescription("Image URL")),

    // PURGE
    new SlashCommandBuilder()
      .setName("purge")
      .setDescription("Delete messages")
      .addStringOption(o =>
        o.setName("amount")
          .setDescription("Number or 'all'")
          .setRequired(true)
      )

  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("🚀 Slash commands registered.");
});

// WELCOMER
client.on("guildMemberAdd", async member => {
  if (member.guild.id !== GUILD_ID) return;

  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#00b0f4")
    .setTitle("✨ Welcome to the Server! ✨")
    .setDescription(`Hey ${member}, we're so happy to have you here! 💖\n\nPlease read the rules and enjoy your stay!`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Member #${member.guild.memberCount}` })
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

// INTERACTIONS
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: "❌ Administrator only command.", ephemeral: true });
  }

  const { commandName } = interaction;

  // BAN
  if (commandName === "ban") {
    const user = interaction.options.getUser("user");
    const duration = interaction.options.getString("duration");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply("User not found.");

    await member.ban();

    if (duration) {
      const time = ms(duration);
      setTimeout(() => {
        interaction.guild.members.unban(user.id).catch(() => {});
      }, time);
      return interaction.reply(`🔨 ${user.tag} banned for ${duration}`);
    }

    return interaction.reply(`🔨 ${user.tag} banned permanently.`);
  }

  // UNBAN
  if (commandName === "unban") {
    const user = interaction.options.getUser("user");
    await interaction.guild.members.unban(user.id);
    return interaction.reply("✅ User unbanned.");
  }

  // KICK
  if (commandName === "kick") {
    const user = interaction.options.getUser("user");
    const member = await interaction.guild.members.fetch(user.id);
    await member.kick();
    return interaction.reply(`👢 ${user.tag} kicked.`);
  }

  // MUTE
  if (commandName === "mute") {
    const user = interaction.options.getUser("user");
    const duration = interaction.options.getString("duration");
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(ms(duration));
    return interaction.reply(`🔇 ${user.tag} muted for ${duration}`);
  }

  // UNMUTE
  if (commandName === "unmute") {
    const user = interaction.options.getUser("user");
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(null);
    return interaction.reply(`🔊 ${user.tag} unmuted.`);
  }

  // WARN
  if (commandName === "warn") {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");

    if (!warnings.has(user.id)) warnings.set(user.id, []);

    if (sub === "add") {
      const reason = interaction.options.getString("reason");
      warnings.get(user.id).push(reason);
      return interaction.reply(`⚠️ Warning added to ${user.tag}`);
    }

    if (sub === "remove") {
      const index = interaction.options.getInteger("warning") - 1;
      const userWarnings = warnings.get(user.id);

      if (!userWarnings[index])
        return interaction.reply("Invalid warning number.");

      userWarnings.splice(index, 1);
      return interaction.reply(`🗑️ Removed warning #${index + 1} from ${user.tag}`);
    }
  }

  // WARNINGS
  if (commandName === "warnings") {
    const user = interaction.options.getUser("user");
    const userWarnings = warnings.get(user.id) || [];

    if (userWarnings.length === 0)
      return interaction.reply("No warnings found.");

    return interaction.reply(
      userWarnings.map((w, i) => `${i + 1}. ${w}`).join("\n")
    );
  }

  // SAY
  if (commandName === "say") {
    const message = interaction.options.getString("message");
    const image = interaction.options.getString("image");

    await interaction.reply({ content: "✅ Sent.", ephemeral: true });

    if (image) {
      const embed = new EmbedBuilder()
        .setDescription(message)
        .setImage(image);
      return interaction.channel.send({ embeds: [embed] });
    }

    return interaction.channel.send(message);
  }

  // PURGE
  if (commandName === "purge") {
    const amount = interaction.options.getString("amount");

    if (amount.toLowerCase() === "all") {
      const messages = await interaction.channel.messages.fetch();
      await interaction.channel.bulkDelete(messages, true);
      return interaction.reply("🧹 All messages deleted.");
    }

    const number = parseInt(amount);
    if (isNaN(number)) return interaction.reply("Invalid number.");

    await interaction.channel.bulkDelete(number, true);
    return interaction.reply(`🧹 Deleted ${number} messages.`);
  }

});

client.login(TOKEN);
