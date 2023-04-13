import OpenAI from "./openai.mjs";
import {Bot, session} from "grammy/web";
import {freeStorage} from "@grammyjs/storage-free";

export const ai = new OpenAI(process.env.OPENAI_API_KEY);
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

bot.use(session({storage: freeStorage(bot.token)}));

bot.on("message:text", async ctx => {
    const {msg: {text: prompt}} = ctx;
    console.log("User:", prompt);
    await ctx.replyWithChatAction("typing");
    try {
        const {choices: [{message: {content}}]} = await ai.chat({prompt});
        console.log("Assistant:", content);
        await ctx.reply(content);
    } catch (e) {
        await ctx.reply(e.message || e);
    }
});

export default bot;
