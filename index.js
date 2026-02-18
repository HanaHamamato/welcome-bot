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
    GatewayIntentBits.GuildMembers
  ]
});

/* ===========================
   CONFIG
=========================== */

// Your Application ID
const CLIENT_ID = "1473707696623583243";

// Add role IDs here if you want special roles allowed to use /kick
// Leave empty [] if you want ADMIN only
const ALLOWED_ROLE_IDS = [
  // "ROLE_ID_HERE"
];

// Welcome channel ID
const WELCOME_CHANNEL_ID = "1473353851305197870";

/* ===========================
   BOT READY
=========================== */

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Register /kick slash command
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

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [kickCommand.toJSON()] }
    );
    console.log("✅ Slash command registered");
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
   KICK COMMAND
=========================== */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "kick") {
    const member = interaction.member;
    const target = interaction.options.getMember("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    // Check permissions
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
});

/* ===========================
   LOGIN
=========================== */

client.login(process.env.TOKEN);