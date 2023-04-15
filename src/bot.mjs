import {Bot, session} from "grammy";
import configs from "../configs.json";
import {hydrate} from "@grammyjs/hydrate";
import {autoRetry} from "@grammyjs/auto-retry";
import {freeStorage} from "@grammyjs/storage-free";
import {hydrateReply, parseMode} from "@grammyjs/parse-mode";
import {API, chatTokens, initEncoder, isSystem, sanitizeMessages, sanitizeName, setSystem} from "./openai.mjs";

export const ai = new API(process.env.OPENAI_API_KEY);
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const handleError = async (ctx, e) => {
    try {
        const message = e.message || e;
        console.error(message);
        return await ctx.reply("⚠️ " + message);
    } catch (e) {
        console.error(e.message || e);
    }
}

const prepareMessage = ctx => {
    if (!ctx?.msg?.reply_to_message?.text) return ctx?.msg?.text;
    const pronoun = ctx.msg.reply_to_message.from.id === ctx.me.id ? "You" : "I";
    return [
        `${pronoun} said «`,
        ctx.msg.reply_to_message.text,
        `». \r\n`,
        ctx.msg.text
    ].join("");
}

const chatRequest = async ctx => {
    const {messages = []} = ctx?.session;
    const result = await ai.chat({messages});
    const {message = {}} = result?.choices?.at?.(0) || {};
    console.log("🤖", message?.content);
    const {message_id} = await ctx.reply(message?.content);
    if (message_id) message.id = message_id;
    messages.push(message);
    return result;
}

const chatMessage = async ctx => {
    const {
        msg: {
            message_id: id
        },
        session: {
            messages = []
        }
    } = ctx;
    const interval = setInterval(() => {
        ctx.replyWithChatAction("typing").catch(console.error);
    }, 5000);
    try {
        const content = prepareMessage(ctx);
        await ctx.replyWithChatAction("typing");
        const targetName = ctx?.chat?.first_name || ctx?.chat?.last_name || ctx?.chat?.username;
        messages.push({name: sanitizeName(targetName), role: "user", content, id});
        console.log("👤", `[${targetName}]`, content);
        return await chatRequest(ctx);
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

bot.command("start", ctx => {
    console.debug("/start");
    const message = ctx?.session?.messages?.length ?
        configs?.messages?.new : configs?.messages?.intro
    ctx.session.messages = [];
    return ctx.reply(message);
});

bot.command("retry", async ctx => {
    try {
        console.debug("/retry");
        const {messages = []} = ctx?.session || {};
        const {message_id} = ctx?.msg?.reply_to_message || {};
        if (message_id) {
            const message = messages.find(({id}) => id === message_id);
            if (!message) return ctx.reply(configs?.messages?.retry?.error);
            const offset = message.role === "user" ? 1 : 0;
            messages.splice(messages.indexOf(message) + offset);
        }
        while (messages?.at?.(-1)?.role === "assistant") messages.pop();
        return await chatRequest(ctx);
    } catch (e) {
        return handleError(ctx, e);
    }
})

bot.command("summary", async ctx => {
    try {
        console.debug("/summary");
        const {messages = []} = ctx?.session || {};
        const {message_id} = ctx?.msg?.reply_to_message || {};
        if (message_id) {
            const system = messages.find(isSystem);
            const message = messages.find(({id}) => id === message_id);
            if (!message) return ctx.reply(configs?.messages?.summary?.error);
            ctx.session.messages = [system, message].filter(Boolean);
            return ctx.reply(configs?.messages?.summary?.success);
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

bot.command("system", async ctx => {
    try {
        console.debug("/system");
        const {messages = []} = ctx?.session || {};
        if (!ctx.match) {
            const {content} = messages.find(isSystem) || {};
            return await ctx.reply(content || configs?.messages?.system?.empty);
        }
        setSystem(ctx.match, messages);
        return await ctx.reply(configs?.messages?.system?.success);
    } catch (e) {
        return handleError(ctx, e);
    }
})

bot.command("tokens", async ctx => {
    try {
        console.debug("/tokens");
        const encoder = await initEncoder();
        const messages = ctx?.session?.messages || [];
        if (!messages.length) {
            const message = [
                `History: 0`,
                `Available: 4096`
            ].join("\r\n");
            return await ctx.reply(message);
        }
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
        console.debug("/history");
        const emoji = {
            user: "👤",
            system: "⚙️",
            assistant: "🤖",
        };
        const messages = sanitizeMessages(ctx?.session?.messages || []);
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
