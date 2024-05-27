const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Permissions, MessageManager,  Collection } = require(`discord.js`);
const fs = require('fs');
const axios = require('axios')
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] }); 

client.commands = new Collection();

require('dotenv').config();

const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");


let lastEarthquakeId;

async function getEarthquakeData() {
    try {
        const response = await axios.get('https://webservices.ingv.it/fdsnws/event/1/query?format=geojson&minmag=2');
        const earthquakes = response.data.features;

        // Prendi l'ultimo terremoto |  Take the latest earthquake
        const earthquake = earthquakes[0];
        const { properties, geometry } = earthquake;

        const eventId = properties.id ? properties.id.toString() : 'N/A';

        // Se l'ID dell'ultimo terremoto è lo stesso dell'ultimo inviato, non fare nulla |  If the ID of the latest earthquake is the same as the last one sent, do nothing
        if (eventId === lastEarthquakeId) {
            return;
        }

        // Aggiorna l'ID dell'ultimo terremoto inviato | Update the ID of the latest earthquake sent
        lastEarthquakeId = eventId;

        const location = properties.place;
        const time = new Date(properties.time);
        const depth = geometry.coordinates[2];
        const longitude = geometry.coordinates[0];
        const latitude = geometry.coordinates[1];
        const magnitude = properties.mag;

        const embed = new EmbedBuilder()
            .setTitle('New Heartquake')
            .setURL('https://terremoti.ingv.it/')
            .setColor('Red')
            .addFields(
                { name: 'Location', value: location, inline: false },
                { name: 'Time', value: time.toString(), inline: false },
                { name: 'Depth', value: `${depth} km`, inline: false },
                { name: 'Longitude', value: longitude.toString(), inline: false },
                { name: 'Latitude', value: latitude.toString(), inline: false },
                { name: 'Magnitude', value: magnitude.toString(), inline: false },
                { name: 'Event ID', value: eventId, inline: false },
            )
            .setImage('https://terremoti.ingv.it/images/banner_lista_terremoti.jpg')
            .setFooter({text: 'Source: INGV-IT | Istituto Nazionale Geofisicia e Vulcanologia', iconURL: 'https://th.bing.com/th?id=ODLS.08c00647-00c0-447b-819e-c3765093a5ef&w=32&h=32&qlt=90&pcl=fffffa&o=6&pid=1.2'})
                    
        // Sostituisci 'channel-id' con l'ID del canale in cui vuoi inviare l'embed | Replace 'channel-id' with the ID of the channel you want to send the embed to
        client.channels.cache.get('').send({ embeds: [embed] });
    } catch (error) {
        console.error(error);
    }
}

// Chiama la funzione ogni 5 minuti (300000 ms) | call the function every 5 minutes
setInterval(getEarthquakeData, 300000);


(async () => {
    for (file of functions) {
        require(`./functions/${file}`)(client);
    }
    client.handleEvents(eventFiles, "./src/events");
    client.handleCommands(commandFolders, "./src/commands");
    client.login(process.env.token)
})();
