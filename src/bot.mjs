import OpenAI from "./openai.mjs";
import {Bot, session} from "grammy/web";
import {freeStorage} from "@grammyjs/storage-free";

export const ai = new OpenAI(process.env.OPENAI_API_KEY);
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

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

bot.on("message:text", async ctx => {
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
    try {
        await ctx.replyWithChatAction("typing");
        messages.push({role: "user", content: text});
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
});

export default bot;
