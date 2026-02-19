require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
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

const WELCOME_CHANNEL_ID = "1473353851305197870";
const TICKET_CATEGORY_ID = "1473675367750570056";

const TICKET_PING_ROLES = [
  "1473342873633161444",
  "1473318391686107271",
  "1473331282862674010",
  "1473331472856518858",
  "1473660986685657120"
];

const afkUsers = new Map();

/* ===========================
   REGISTER COMMANDS
=========================== */

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  const commands = [

    new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Kick a member")
      .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason")),

    new SlashCommandBuilder()
      .setName("afk")
      .setDescription("Set yourself AFK")
      .addStringOption(o => o.setName("reason").setDescription("Reason")),

    new SlashCommandBuilder()
      .setName("clear")
      .setDescription("Clear messages")
      .addStringOption(o => o.setName("amount").setDescription("1-100 or all").setRequired(true)),

    new SlashCommandBuilder()
      .setName("userinfo")
      .setDescription("User info")
      .addUserOption(o => o.setName("user").setDescription("User")),

    new SlashCommandBuilder()
      .setName("embedannouncement")
      .setDescription("Admin embed announcement")
      .addStringOption(o => o.setName("title").setDescription("Title").setRequired(true))
      .addStringOption(o => o.setName("message").setDescription("Message").setRequired(true))
      .addStringOption(o => o.setName("color").setDescription("Hex color").setRequired(true))
      .addStringOption(o => o.setName("image").setDescription("Optional image")),

    new SlashCommandBuilder()
      .setName("ticketmessage")
      .setDescription("Send ticket panel")
      .addStringOption(o => o.setName("title").setDescription("Embed title").setRequired(true))
      .addStringOption(o => o.setName("message").setDescription("Embed message").setRequired(true))
      .addStringOption(o => o.setName("buttoncolor").setDescription("green/red/blue").setRequired(true))
      .addChannelOption(o => o.setName("channel").setDescription("Channel").setRequired(true)),

    new SlashCommandBuilder()
      .setName("ticketclose")
      .setDescription("Close a ticket"),

    new SlashCommandBuilder()
      .setName("ticketdelete")
      .setDescription("Delete a ticket")

  ];

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );

  console.log("✅ All commands registered.");
});

/* ===========================
   WELCOME
=========================== */

client.on("guildMemberAdd", member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("👋 Welcome!")
    .setDescription(`Hey ${member}, welcome to **${member.guild.name}** 💖`)
    .setColor(0xff69b4);

  channel.send({ embeds: [embed] });
});

/* ===========================
   INTERACTIONS
=========================== */

client.on("interactionCreate", async interaction => {

  /* ===== BUTTON CLICK (CREATE TICKET) ===== */
  if (interaction.isButton() && interaction.customId === "create_ticket") {

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        ...TICKET_PING_ROLES.map(roleId => ({
          id: roleId,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }))
      ]
    });

    await ticketChannel.send({
      content: `${interaction.user} ${TICKET_PING_ROLES.map(r => `<@&${r}>`).join(" ")}`,
      embeds: [
        new EmbedBuilder()
          .setTitle("🎫 New Ticket")
          .setDescription("Support will be with you shortly.")
          .setColor(0x00ff99)
      ]
    });

    return interaction.reply({ content: "✅ Ticket created!", ephemeral: true });
  }

  if (!interaction.isChatInputCommand()) return;

  const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

  /* ===== TICKET PANEL ===== */
  if (interaction.commandName === "ticketmessage") {

    if (!isAdmin) return interaction.reply({ content: "Admins only.", ephemeral: true });

    const title = interaction.options.getString("title");
    const message = interaction.options.getString("message");
    const colorInput = interaction.options.getString("buttoncolor");
    const channel = interaction.options.getChannel("channel");

    let style = ButtonStyle.Primary;
    if (colorInput.toLowerCase() === "green") style = ButtonStyle.Success;
    if (colorInput.toLowerCase() === "red") style = ButtonStyle.Danger;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(message)
      .setColor(0x2b2d31);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Create Ticket")
        .setStyle(style)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: "✅ Ticket panel sent.", ephemeral: true });
  }

  /* ===== TICKET CLOSE ===== */
  if (interaction.commandName === "ticketclose") {

    if (!isAdmin) return interaction.reply({ content: "Admins only.", ephemeral: true });

    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      ViewChannel: false
    });

    return interaction.reply("🔒 Ticket closed.");
  }

  /* ===== TICKET DELETE ===== */
  if (interaction.commandName === "ticketdelete") {

    if (!isAdmin) return interaction.reply({ content: "Admins only.", ephemeral: true });

    await interaction.reply("🗑️ Deleting ticket...");
    setTimeout(() => interaction.channel.delete(), 2000);
  }

  /* ===== KICK ===== */
  if (interaction.commandName === "kick") {

    if (!isAdmin) return interaction.reply({ content: "Admins only.", ephemeral: true });

    const target = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "No reason";

    if (!target || !target.kickable)
      return interaction.reply({ content: "Cannot kick user.", ephemeral: true });

    await target.kick(reason);
    return interaction.reply(`👢 ${target.user.tag} kicked.`);
  }

  /* ===== AFK ===== */
  if (interaction.commandName === "afk") {
    afkUsers.set(interaction.user.id, { reason: "AFK" });
    return interaction.reply("🌙 You are now AFK.");
  }

  /* ===== CLEAR ===== */
  if (interaction.commandName === "clear") {

    if (!isAdmin) return interaction.reply({ content: "Admins only.", ephemeral: true });

    const input = interaction.options.getString("amount");
    const amount = input === "all" ? 100 : parseInt(input);

    const deleted = await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `🧹 Cleared ${deleted.size}`, ephemeral: true });
  }

  /* ===== USERINFO ===== */
  if (interaction.commandName === "userinfo") {

    const target = interaction.options.getUser("user") || interaction.user;
    const member = interaction.guild.members.cache.get(target.id);

    const embed = new EmbedBuilder()
      .setTitle("👤 User Info")
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "Username", value: target.tag, inline: true },
        { name: "ID", value: target.id, inline: true }
      )
      .setColor(0x00bfff);

    return interaction.reply({ embeds: [embed] });
  }

});

/* ===========================
   LOGIN
=========================== */

client.login(process.env.TOKEN);
