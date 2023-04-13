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
            text: content = ""
        },
        session: {
            messages = []
        }
    } = ctx;
    console.log("User:", content);
    messages.push({role: "user", content});
    await ctx.replyWithChatAction("typing");
    try {
        const {
            choices: [
                {
                    message: {
                        content = ""
                    } = {}
                } = {}
            ] = []
        } = await ai.chat({messages});
        messages.push({role: "assistant", content});
        console.log("Assistant:", content);
        return ctx.reply(content);
    } catch (e) {
        return ctx.reply(e.message || e);
    }
});

export default bot;
