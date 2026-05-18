const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ═══════════════════════════════════════════
// SLASH COMMANDS
// ═══════════════════════════════════════════
const commands = [
    new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('Définir le rôle attribué automatiquement aux nouveaux membres')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à attribuer')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('nom')
        .setDescription('Définir ton nom et prénom RP')
        .addStringOption(option =>
            option.setName('prenom')
                .setDescription('Ton prénom RP')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nom')
                .setDescription('Ton nom de famille RP')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Renommer un membre avec un nom RP (admin)')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Le membre à renommer')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('prenom')
                .setDescription('Prénom RP')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nom')
                .setDescription('Nom de famille RP')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprimer un nombre de messages dans le salon')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
];

// ═══════════════════════════════════════════
// BOT READY
// ═══════════════════════════════════════════
client.once('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
    console.log(`📡 Présent sur ${client.guilds.cache.size} serveur(s)`);

    // Enregistrer les slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: commands.map(cmd => cmd.toJSON())
        });
        console.log('✅ Slash commands enregistrées');
    } catch (error) {
        console.error('❌ Erreur enregistrement des commands:', error);
    }
});

// ═══════════════════════════════════════════
// AUTO-ROLE : Quand un membre rejoint le serveur
// ═══════════════════════════════════════════
client.on('guildMemberAdd', async (member) => {
    console.log(`👋 ${member.user.tag} a rejoint le serveur`);

    // Renommer automatiquement le pseudo en "NOM ET PRENOM RP"
    try {
        await member.setNickname('NOM ET PRENOM RP');
        console.log(`✅ Pseudo de ${member.user.tag} changé en "NOM ET PRENOM RP"`);
    } catch (error) {
        console.error(`❌ Impossible de changer le pseudo de ${member.user.tag}:`, error);
    }

    // Attribution du rôle automatique
    const roleId = process.env.AUTO_ROLE_ID;
    if (roleId) {
        try {
            const role = member.guild.roles.cache.get(roleId);
            if (role) {
                await member.roles.add(role);
                console.log(`✅ Rôle "${role.name}" attribué à ${member.user.tag}`);
            } else {
                console.error(`❌ Rôle avec l'ID ${roleId} introuvable`);
            }
        } catch (error) {
            console.error(`❌ Impossible d'attribuer le rôle:`, error);
        }
    }

    // Envoyer un message de bienvenue en DM
    try {
        const embed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle('Bienvenue sur le serveur !')
            .setDescription(
                `Salut ${member.user} ! 👋\n\n` +
                `Pour définir ton **nom RP**, utilise la commande :\n` +
                `\`/nom prenom:TonPrénom nom:TonNom\`\n\n` +
                `Ton pseudo sera affiché sous la forme : **Prénom Nom**`
            )
            .setTimestamp();
        await member.send({ embeds: [embed] });
    } catch (error) {
        console.log(`⚠️ Impossible d'envoyer un DM à ${member.user.tag}`);
    }
});

// ═══════════════════════════════════════════
// GESTION DES SLASH COMMANDS
// ═══════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // ──── /setrole ────
    if (interaction.commandName === 'setrole') {
        const role = interaction.options.getRole('role');
        process.env.AUTO_ROLE_ID = role.id;

        // Mettre à jour le fichier .env
        const fs = require('fs');
        const envPath = require('path').join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/AUTO_ROLE_ID=.*/, `AUTO_ROLE_ID=${role.id}`);
        fs.writeFileSync(envPath, envContent);

        await interaction.reply({
            content: `✅ Le rôle **${role.name}** sera maintenant attribué automatiquement aux nouveaux membres !`,
            ephemeral: true
        });
    }

    // ──── /nom ────
    if (interaction.commandName === 'nom') {
        const prenom = interaction.options.getString('prenom');
        const nom = interaction.options.getString('nom');
        const nouveauPseudo = `${prenom} ${nom}`;

        try {
            await interaction.member.setNickname(nouveauPseudo);
            await interaction.reply({
                content: `✅ Ton pseudo a été changé en **${nouveauPseudo}** !`,
                ephemeral: true
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ Impossible de changer ton pseudo. Vérifie que le bot a la permission de gérer les pseudos et qu'il a un rôle supérieur au tien.`,
                ephemeral: true
            });
        }
    }

    // ──── /clear ────
    if (interaction.commandName === 'clear') {
        const clearRoleId = process.env.CLEAR_ROLE_ID;
        if (clearRoleId && !interaction.member.roles.cache.has(clearRoleId)) {
            return interaction.reply({
                content: `❌ Tu n'as pas le rôle nécessaire pour utiliser cette commande.`,
                ephemeral: true
            });
        }

        const nombre = interaction.options.getInteger('nombre');
        try {
            const deleted = await interaction.channel.bulkDelete(nombre, true);
            await interaction.reply({
                content: `✅ **${deleted.size}** message(s) supprimé(s) !`,
                ephemeral: true
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ Impossible de supprimer les messages. Les messages de plus de 14 jours ne peuvent pas être supprimés en masse.`,
                ephemeral: true
            });
        }
    }

    // ──── /rename ────
    if (interaction.commandName === 'rename') {
        const membre = interaction.options.getMember('membre');
        const prenom = interaction.options.getString('prenom');
        const nom = interaction.options.getString('nom');
        const nouveauPseudo = `${prenom} ${nom}`;

        try {
            await membre.setNickname(nouveauPseudo);
            await interaction.reply({
                content: `✅ Le pseudo de ${membre.user} a été changé en **${nouveauPseudo}** !`,
                ephemeral: true
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ Impossible de renommer ce membre. Vérifie les permissions du bot.`,
                ephemeral: true
            });
        }
    }
});

// ═══════════════════════════════════════════
// CONNEXION
// ═══════════════════════════════════════════
client.login(process.env.BOT_TOKEN);
