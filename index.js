import express from 'express';
import fs from 'fs';
import ws from 'ws';
import expressWs from 'express-ws';
import { job } from './keep_alive.js';
import { GoogleGenerativeAIOperations } from './openai_operations.js';
import { TwitchBot } from './twitch_bot.js';

// start keep alive cron job
job.start();
console.log(process.env);

// setup express app
const app = express();
const expressWsInstance = expressWs(app);

// set the view engine to ejs
app.set('view engine', 'ejs');

// load env variables
let GPT_MODE = process.env.GPT_MODE || "CHAT";
let HISTORY_LENGTH = process.env.HISTORY_LENGTH || 5;
let OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let MODEL_NAME = process.env.MODEL_NAME || "gemini-1.5-flash";
let TWITCH_USER = process.env.TWITCH_USER || "valerie__xoxo";
let TWITCH_AUTH = process.env.TWITCH_AUTH || "oauth:vgvx55j6qzz1lkt3cwggxki1lv53c2";
let COMMAND_NAME = process.env.COMMAND_NAME ? process.env.COMMAND_NAME.split(",").map(cmd => cmd.toLowerCase()) : ["!gpt"];
let CHANNELS = process.env.CHANNELS ? process.env.CHANNELS.split(",") : ["deathwish_xoxo"];
let SEND_USERNAME = process.env.SEND_USERNAME === "true";
let ENABLE_TTS = process.env.ENABLE_TTS === "true";
let ENABLE_CHANNEL_POINTS = process.env.ENABLE_CHANNEL_POINTS === "true";

if (!OPENAI_API_KEY) {
    console.error("No OPENAI_API_KEY found. Please set it as environment variable.");
    process.exit(1);
}

// init global variables
const MAX_LENGTH = 399;
let file_context = fs.readFileSync("./file_context.txt", 'utf8');
let last_user_message = "";

// setup twitch bot
const channels = CHANNELS;
console.log("Channels: " + channels.join(", "));

const bot = new TwitchBot(TWITCH_USER, TWITCH_AUTH, channels, OPENAI_API_KEY, ENABLE_TTS);

// setup openai operations
const openai_ops = new GoogleGenerativeAIOperations(file_context, OPENAI_API_KEY, MODEL_NAME, HISTORY_LENGTH);

// setup twitch bot callbacks
bot.onConnected((addr, port) => {
    console.log(`* Connected to ${addr}:${port}`);
    channels.forEach(channel => {
        console.log(`* Joining ${channel}`);
        bot.say(channel, "Hello! The bot has joined the chat.");
    });
});

bot.onDisconnected((reason) => {
    console.log(`Disconnected: ${reason}`);
});

// connect bot
bot.connect(
    () => {
        console.log("Bot connected!");
    },
    (error) => {
        console.error("Bot couldn't connect!");
        console.error(error);
    }
);

bot.onMessage(async (channel, user, message, self) => {
    if (self) return;

    if (ENABLE_CHANNEL_POINTS && user["msg-id"] === "highlighted-message") {
        console.log(`The message is ${message}`);
        const response = await openai_ops.make_geminiai_call(message);
        bot.say(channel, response);
    }

    if (COMMAND_NAME.some(cmd => message.toLowerCase().startsWith(cmd))) {
        let text = message.slice(COMMAND_NAME.find(cmd => message.toLowerCase().startsWith(cmd)).length).trim();

        if (SEND_USERNAME) {
            text = `Message from user ${user.username}: ${text}`;
        }

        // make openai call
        const response = await openai_ops.make_geminiai_call(text);

        // split response if it exceeds twitch chat message length limit
        if (response.length > MAX_LENGTH) {
            const messages = response.match(new RegExp(`.{1,${MAX_LENGTH}}`, "g"));
            messages.forEach((message, index) => {
                setTimeout(() => {
                    bot.say(channel, message);
                }, 1000 * index);
            });
        } else {
            bot.say(channel, response);
        }

        if (ENABLE_TTS) {
            try {
                const ttsAudioUrl = await bot.sayTTS(channel, response, user['userstate']);
                notifyFileChange(ttsAudioUrl);
            } catch (error) {
                console.error(error);
            }
        }
    }
});

app.ws('/check-for-updates', (ws, req) => {
    ws.on('message', (message) => {
        // Handle WebSocket messages (if needed)
    });
});

// setup bot
const messages = [
    {role: "system", content: "You are a helpful Twitch Chatbot."}
];

app.use(express.json({ extended: true, limit: '1mb' }));
app.use('/public', express.static('public'));

app.all('/', (req, res) => {
    console.log("Just got a request!");
    res.render('pages/index');
});

app.get('/gpt/:text', async (req, res) => {
    const text = req.params.text;

    const answer_question = async (answer) => {
        if (answer.length > MAX_LENGTH) {
            const messages = answer.match(new RegExp(`.{1,${MAX_LENGTH}}`, "g"));
            messages.forEach((message, index) => {
                setTimeout(() => {
                    bot.say(channel, message);
                }, 1000 * index);
            });
        } else {
            bot.say(channel, answer);
        }
    };

    let answer = "";
    if (GPT_MODE === "CHAT") {
        answer = await openai_ops.make_geminiai_call(text);
    } else if (GPT_MODE === "PROMPT") {
        const prompt = `${file_context}\n\nUser: ${text}\nAgent:`;
        answer = await openai_ops.make_geminiai_call(prompt);
    } else {
        console.error("ERROR: GPT_MODE is not set to CHAT or PROMPT. Please set it as environment variable.");
    }

    await answer_question(answer);
    res.send(answer);
});

const server = app.listen(3000, () => {
    console.log('Server running on port 3000');
});

const wss = expressWsInstance.getWss();
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        // Handle client messages (if needed)
    });
});

function notifyFileChange() {
    wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify({ updated: true }));
        }
    });
}
