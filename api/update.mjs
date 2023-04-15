import {promisify} from "util";
import bot from "../src/bot.mjs";
import {webhookCallback} from "grammy";

const wait = promisify((a, f) => setTimeout(f, a));

export default async (req, ctx) => {
    let time = 0;
    let streamController;
    const waitLimit = 90_000;
    const requestLimit = 59_000;
    const limit = wait(requestLimit);
    const encoder = new TextEncoder();
    const handler = webhookCallback(bot, "std/http", "return", waitLimit);
    const task = handler(req, ctx).finally(async () => {
        await fetch(`https://edge.requestcatcher.com/response`).then(r => r.text());
        streamController.close();
    });
    ctx.waitUntil(task);
    ctx.waitUntil(wait(waitLimit));
    const stream = new ReadableStream({
        start: controller => {
            fetch(`https://edge.requestcatcher.com/start`).then(r => r.text());
            streamController = controller;
            controller.enqueue(encoder.encode(String("OK")));
        },
        async pull(controller) {
            fetch(`https://edge.requestcatcher.com/pull`).then(r => r.text());
            await limit;
            ctx.waitUntil(wait(waitLimit));
            fetch(`https://edge.requestcatcher.com/limit`).then(r => r.text());
            return controller.close();
        }
    });
    setInterval(() => fetch(`https://edge.requestcatcher.com/time/${time += 10}`).then(r => r.text()), 10000);
    return new Response(stream);
};

export const config = {runtime: "edge"};
