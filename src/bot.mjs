import {Bot, session} from "grammy/web";
import {freeStorage} from "@grammyjs/storage-free";

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

bot.use(session({
    initial: () => ({count: 0}),
    storage: freeStorage(bot.token),
}));

bot.on("message:text", async ctx => {
    ctx.session.count++;
    await ctx.reply(`Message count: ${ctx.session.count}`);
});

export default bot;
