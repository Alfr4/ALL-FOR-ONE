const { EmbedBuilder } = require('discord.js');
const { antisetupCollection, anticonfigcollection } = require('../mongodb');

const antiLink = (client) => {
    const linkMap = new Map();
    console.log('\x1b[36m[ SICUREZZA ]\x1b[0m', '\x1b[32mSistema Anti-Link Attivo ✅\x1b[0m');

    client.on('messageCreate', async (message) => {
        if (!message.guild) return;

        const { author, content, channel, guild } = message;
        if (author.bot) return;

        try {
      
            const guildConfig = await antisetupCollection.findOne({ serverId: guild.id });
            const settings = guildConfig?.antiLink;
            if (!settings?.enabled) return;

            
            const antiConfig = await anticonfigcollection.findOne({ serverId: guild.id });
            const canaliWhitelist = antiConfig?.whitelisted_antilink_channels || [];
            const tipiLinkWhitelist = antiConfig?.whitelisted_antilink_types || [];
            const { ownerIds = [], adminIds = [] } = guildConfig || {};

            
            if (ownerIds.includes(author.id) || adminIds.includes(author.id)) return;

        
            if (canaliWhitelist.includes(channel.id)) return;

      
            const linkRegex = /https?:\/\/\S+/gi;
            const links = content.match(linkRegex);
            if (links) {
        
                const isLinkInWhitelist = links.some(link =>
                    tipiLinkWhitelist.some(type => new URL(link).hostname.includes(type))
                );
                if (isLinkInWhitelist) return; 

                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Rilevamento Link')
                    .setDescription(`Sono stati rilevati link in un messaggio.`)
                    .addFields(
                        { name: 'Utente', value: `${author} (${author.id})`, inline: true },
                        { name: 'Canale', value: `${channel} (${channel.id})`, inline: true },
                        { name: 'Contenuto del Messaggio', value: content, inline: false },
                        { name: 'Link Rilevati', value: links.join(', '), inline: false }
                    )
                    .setTimestamp();

                if (settings.mode === 'full') {
                    await message.delete();
                    await channel.send(`${author}, non è consentito postare link!`);
                    await logLinkDetection(guildConfig, embed);
                } else if (settings.mode === 'partial') {
                    const currentTime = Date.now();
                    const lastLinkTime = linkMap.get(author.id) || 0;

                    if (currentTime - lastLinkTime < settings.linkInterval) {
                        await message.delete();
                        await channel.send(`${author}, puoi postare link solo ogni ${settings.linkInterval / 1000} secondi!`);
                        await logLinkDetection(guildConfig, embed);
                    } else {
                        linkMap.set(author.id, currentTime);
                    }
                }
            }
        } catch (error) {
            //console.error('Errore durante il recupero della configurazione del server o l'elaborazione dei dati:', error);
        }
    });

    const logLinkDetection = async (guildConfig, embed) => {
        const logChannel = client.channels.cache.get(guildConfig.logChannelId);
        if (logChannel) {
            try {
                await logChannel.send({ embeds: [embed] });
            } catch (error) {
                //console.error('Invio del messaggio di log fallito:', error);
            }
        } else {
            //console.error('Canale di log non trovato o il bot non ha i permessi necessari.');
        }
    };
};

module.exports = antiLink;
