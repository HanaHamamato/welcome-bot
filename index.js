require("dotenv").config();

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

const CLIENT_ID = "1473707696623583243";
const GUILD_ID = "1473276487758254261";

const ALLOWED_ROLE_IDS = [];
const WELCOME_CHANNEL_ID = "1473353851305197870";

/* ===========================
   AFK STORAGE
=========================== */

const afkUsers = new Map();

/* ===========================
   BOT READY
=========================== */

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  // 🔥 STEP 1: DELETE OLD GLOBAL COMMANDS (REMOVES DUPLICATES)
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: [] }
  );

  console.log("🗑️ Old GLOBAL commands deleted");

  // STEP 2: Recreate commands properly (GUILD ONLY)

  const kickCommand = new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption(option =>
      option.setName("user").setDescription("User to kick").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason").setRequired(false)
    );

  const afkCommand = new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set yourself as AFK")
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason").setRequired(false)
    );

  const clearCommand = new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear messages from the channel")
    .addStringOption(option =>
      option.setName("amount").setDescription("1–100 or 'all'").setRequired(true)
    );

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: [kickCommand, afkCommand, clearCommand].map(c => c.toJSON()) }
  );

  console.log("✅ Guild slash commands registered correctly");
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

  if (interaction.commandName === "kick") {
    const member = interaction.member;
    const target = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "No reason";

    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const hasAllowedRole = ALLOWED_ROLE_IDS.some(id => member.roles.cache.has(id));

    if (!isAdmin && !hasAllowedRole)
      return interaction.reply({ content: "❌ No permission.", ephemeral: true });

    if (!target || !target.kickable)
      return interaction.reply({ content: "❌ Cannot kick user.", ephemeral: true });

    await target.kick(reason);
    return interaction.reply(`👢 **${target.user.tag}** kicked.\n📝 ${reason}`);
  }

  if (interaction.commandName === "afk") {
    const reason = interaction.options.getString("reason") || "AFK";
    afkUsers.set(interaction.user.id, { reason, since: Date.now() });
    return interaction.reply(`🌙 You are now AFK.\n📝 ${reason}`);
  }

  if (interaction.commandName === "clear") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
      return interaction.reply({ content: "❌ Need Manage Messages.", ephemeral: true });

    const input = interaction.options.getString("amount");
    const amount = input === "all" ? 100 : parseInt(input);

    if (isNaN(amount) || amount < 1 || amount > 100)
      return interaction.reply({ content: "❌ Use 1–100 or 'all'.", ephemeral: true });

    const deleted = await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `🧹 Cleared **${deleted.size}** messages.`, ephemeral: true });
  }
});

/* ===========================
   AFK MESSAGE HANDLER
=========================== */

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);
    message.reply("✨ Welcome back! AFK removed.");
  }

  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const afk = afkUsers.get(user.id);
      message.reply(`🚫 **${user.tag}** is AFK.\n📝 ${afk.reason}`);
      message.delete().catch(() => {});
    }
  });
});

/* ===========================
   LOGIN
=========================== */

client.login(process.env.TOKEN);