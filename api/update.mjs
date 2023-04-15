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
    const stream = new ReadableStream({
        start: controller => {
            fetch(`https://edge.requestcatcher.com/start`).then(r => r.text());
            streamController = controller;
            controller.enqueue(encoder.encode(String("OK")));
        },
        async pull(controller) {
            fetch(`https://edge.requestcatcher.com/pull`).then(r => r.text());
            await limit;
            fetch(`https://edge.requestcatcher.com/limit`).then(r => r.text());
            return controller.close();
        }
    });
    const handler = webhookCallback(bot, "std/http", "return", waitLimit);
    handler(req, ctx).finally(() => {
        fetch(`https://edge.requestcatcher.com/response`).then(r => r.text());
        streamController.close();
    });
    setInterval(() => fetch(`https://edge.requestcatcher.com/time/${time += 10}`).then(r => r.text()), 10000);
    ctx.waitUntil(wait(waitLimit));
    return new Response(stream);
};

export const config = {runtime: "edge"};
