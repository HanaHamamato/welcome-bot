const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ===========================
   CONFIG
=========================== */

// Your Application ID
const CLIENT_ID = "1473707696623583243";

// Add role IDs here if you want special roles allowed to use /kick
const ALLOWED_ROLE_IDS = [
  // "ROLE_ID_HERE"
];

// Welcome channel ID
const WELCOME_CHANNEL_ID = "1473353851305197870";

/* ===========================
   AFK STORAGE
=========================== */

const afkUsers = new Map(); 
// userId => { reason, since }

/* ===========================
   BOT READY
=========================== */

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const kickCommand = new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to kick")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for kick")
        .setRequired(false)
    );

  const afkCommand = new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set yourself as AFK")
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for going AFK")
        .setRequired(false)
    );

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [kickCommand.toJSON(), afkCommand.toJSON()] }
    );
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error(err);
  }
});

/* ===========================
   WELCOME SYSTEM
=========================== */

client.on("guildMemberAdd", member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("👋 Welcome!")
    .setDescription(`Hey ${member}, welcome to **${member.guild.name}** 💖`)
    .setColor(0xff69b4)
    .setImage("https://media.tenor.com/1iSR3yT5pWMAAAAC/anime-welcome.gif");

  channel.send({ embeds: [embed] });
});

/* ===========================
   SLASH COMMANDS
=========================== */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  /* ========= KICK ========= */
  if (interaction.commandName === "kick") {
    const member = interaction.member;
    const target = interaction.options.getMember("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    const isAdmin = member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    const hasAllowedRole = ALLOWED_ROLE_IDS.some(roleId =>
      member.roles.cache.has(roleId)
    );

    if (!isAdmin && !hasAllowedRole) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
    }

    if (!target) {
      return interaction.reply({
        content: "❌ User not found.",
        ephemeral: true
      });
    }

    if (!target.kickable) {
      return interaction.reply({
        content: "❌ I cannot kick this user (role may be higher than mine).",
        ephemeral: true
      });
    }

    await target.kick(reason);

    await interaction.reply(
      `👢 **${target.user.tag}** was kicked.\n📝 Reason: ${reason}`
    );
  }

  /* ========= AFK ========= */
  if (interaction.commandName === "afk") {
    const reason = interaction.options.getString("reason") || "AFK";
    const userId = interaction.user.id;

    afkUsers.set(userId, {
      reason: reason,
      since: Date.now()
    });

    return interaction.reply({
      content: `🌙 You are now AFK.\n📝 Reason: ${reason}`,
      ephemeral: false
    });
  }
});

/* ===========================
   AFK MESSAGE HANDLER
=========================== */

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  // Remove AFK when user speaks again
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);
    message.reply("✨ Welcome back! Your AFK status has been removed.");
  }

  // Check mentions
  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const afkData = afkUsers.get(user.id);

      message.reply(
        `🚫 **${user.tag}** is currently AFK.\n📝 Reason: ${afkData.reason}`
      );

      // Delete the message to block mention
      message.delete().catch(() => {});
    }
  });
});

/* ===========================
   LOGIN
=========================== */

client.login(process.env.TOKEN);
