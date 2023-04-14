import {Bot, session} from "grammy";
import configs from "../configs.json";
import {hydrate} from "@grammyjs/hydrate";
import {autoRetry} from "@grammyjs/auto-retry";
import {freeStorage} from "@grammyjs/storage-free";
import {hydrateReply, parseMode} from "@grammyjs/parse-mode";
import {API, chatTokens, initEncoder, isSystem, sanitizeMessages, sanitizeName} from "./openai.mjs";

export const ai = new API(process.env.OPENAI_API_KEY);
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const handleError = async (ctx, e) => {
    try {
        const message = e.message || e;
        console.error(message);
        return await ctx.reply(message);
    } catch (e) {
        console.error(e.message || e);
    }
}

const chatMessage = async ctx => {
    const {
        msg: {
            message_id: id,
            text = ""
        },
        session: {
            messages = []
        }
    } = ctx;
    const interval = setInterval(() => {
        ctx.replyWithChatAction("typing").catch(console.error);
    }, 5000);
    const targetName = ctx.chat.first_name || ctx.chat.last_name || ctx.chat.username;
    try {
        await ctx.replyWithChatAction("typing");
        messages.push({name: sanitizeName(targetName), role: "user", content: text, id});
        const {
            choices: [
                {
                    message = {}
                } = {}
            ] = []
        } = await ai.chat({messages});
        const {message_id} = await ctx.reply(message.content);
        if (message_id) message.id = message_id;
        messages.push(message);
    } catch (e) {
        return handleError(ctx, e);
    } finally {
        clearInterval(interval);
    }
}

bot.use(hydrate());

bot.use(hydrateReply);

bot.use(session({
    initial: () => ({messages: []}),
    storage: freeStorage(bot.token)
}));

bot.api.config.use(autoRetry({
    maxDelaySeconds: 10,
    maxRetryAttempts: 1,
}));

bot.api.config.use(parseMode("markdown"));

bot.command("start", ctx => {
    const message = ctx?.session?.messages?.length ? configs.messages.new : configs.messages.intro
    ctx.session.messages = [];
    return ctx.reply(message);
});

bot.command("summary", async ctx => {
    try {
        const {messages} = ctx.session;
        const {message_id} = ctx?.msg?.reply_to_message || {};
        if (message_id) {
            const system = messages.find(isSystem);
            const message = messages.find(({id}) => id === message_id);
            ctx.session.messages = [system, message].filter(Boolean);
            return ctx.reply("Selected message used as summary.");
        }
        ctx.msg.text = ctx.match || configs?.prompts?.summary;
        const result = await chatMessage(ctx);
        const message = messages.pop();
        const system = messages.find(isSystem);
        ctx.session.messages = [system, message].filter(Boolean);
        return result;
    } catch (e) {
        return handleError(ctx, e);
    }
});

bot.command("tokens", async ctx => {
    try {
        const encoder = await initEncoder();
        const messages = ctx.session.messages;
        const tokens = chatTokens({encoder, messages});
        const availableTokens = 4096 - tokens;
        const message = [
            `History: ${tokens}`,
            `Available: ${availableTokens}`
        ].join("\r\n");
        return await ctx.reply(message);
    } catch (e) {
        return handleError(ctx, e);
    }
});

bot.command("history", async ctx => {
    try {
        const emoji = {
            user: "👤",
            system: "⚙️",
            assistant: "🤖",
        };
        const messages = sanitizeMessages(ctx.session.messages);
        await ctx.reply(`${messages.length} messages in history:`);
        return await messages.reduce((promise = Promise.resolve(), {role, content} = {}) => {
            const message = `${emoji[role] || "⚠️"}: ${content}`;
            return promise.then(() => ctx.reply(message).catch(e => handleError(ctx, e)));
        }, Promise.resolve());
    } catch (e) {
        return handleError(ctx, e);
    }
});

bot.on("message:text", chatMessage);

export default bot;
