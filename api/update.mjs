import {promisify} from "util";
import bot from "../src/bot.mjs";
import {webhookCallback} from "grammy";

const wait = promisify((a, f) => setTimeout(f, a));

export default async (req, ctx) => {
    try {
        let time = 0;
        let streamController;
        const waitLimit = 150_000;
        const encoder = new TextEncoder();
        const handler = webhookCallback(bot, "std/http", "return", waitLimit);
        const stream = new ReadableStream({
            start: controller => {
                fetch(`https://edge.requestcatcher.com/start`).then(r => r.text());
                streamController = controller;
                controller.enqueue(encoder.encode(String("OK")));
            },
            async pull(controller) {
                fetch(`https://edge.requestcatcher.com/pull`).then(r => r.text());
                await wait(waitLimit);
                fetch(`https://edge.requestcatcher.com/limit`).then(r => r.text());
                return controller.close();
            }
        });
        handler(req, ctx).catch(() => undefined).finally(async () => {
            await fetch(`https://edge.requestcatcher.com/response`).then(r => r.text());
            streamController.close();
        });
        setInterval(() => fetch(`https://edge.requestcatcher.com/time/${time += 10}`).then(r => r.text()), 10000);
        return new Response(stream);
    } catch (e) {
        console.error(e);
        return new Response(e.message);
    }
};

export const config = {runtime: "edge"};
