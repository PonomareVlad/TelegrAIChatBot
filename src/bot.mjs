import {Bot, session} from "grammy/web";
import {freeStorage} from "@grammyjs/storage-free";
import {API, chatTokens, initEncoder, isSystem, sanitizeMessages, sanitizeName} from "./openai.mjs";

export const ai = new API(process.env.OPENAI_API_KEY);
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const chatMessage = async ctx => {
    const {
        msg: {
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
        messages.push({name: sanitizeName(targetName), role: "user", content: text});
        const {
            choices: [
                {
                    message = {}
                } = {}
            ] = []
        } = await ai.chat({messages});
        messages.push(message);
        return ctx.reply(message.content);
    } catch (e) {
        console.error(e);
        return ctx.reply(e.message || e);
    } finally {
        clearInterval(interval);
    }
}

bot.use(session({
    initial: () => ({messages: []}),
    storage: freeStorage(bot.token)
}));

bot.command("start", ctx => {
    const message = ctx?.session?.messages?.length ?
        "You started a new conversation, the story was deleted." :
        "Send any text message to start conversation."
    ctx.session.messages = [];
    return ctx.reply(message);
});

bot.command("summary", async ctx => {
    try {
        ctx.msg.text = `Summarize this conversation.`;
        const result = await chatMessage(ctx);
        const message = ctx.session.messages.pop();
        const system = ctx.session.messages.find(isSystem);
        ctx.session.messages = [system, message].filter(Boolean);
        return result;
    } catch (e) {
        console.error(e);
        return ctx.reply(e.message || e);
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
        return ctx.reply(message);
    } catch (e) {
        console.error(e);
        return ctx.reply(e.message || e);
    }
});

bot.command("history", ctx => {
    try {
        const emoji = {
            user: "👤",
            system: "⚙️",
            assistant: "🤖",
        };
        const messages = sanitizeMessages(ctx.session.messages);
        return messages.reduce((promise = Promise.resolve(), {role, content} = {}) => {
            const message = `${emoji[role] || "⚠️"}: ${content}`;
            return promise.then(() => ctx.reply(message));
        }, Promise.resolve());
    } catch (e) {
        console.error(e);
        return ctx.reply(e.message || e);
    }
});

bot.on("message:text", chatMessage);

export default bot;
