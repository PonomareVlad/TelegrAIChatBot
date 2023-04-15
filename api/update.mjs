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
                controller.enqueue(encoder.encode(String("A few hours later ")));
            },
            async pull(controller) {
                await wait(1000);
                controller.enqueue(encoder.encode(String(".")));
            }
        });
        handler(req, ctx).catch(() => undefined).finally(async () => {
            console.log("Time:", time);
            await fetch(`https://edge.requestcatcher.com/response/${time}`).then(r => r.text());
            streamController.close();
        });
        setInterval(() => fetch(`https://edge.requestcatcher.com/time/${time}`).then(r => r.text()), 10000);
        setInterval(() => time++, 1000);
        return new Response(stream);
    } catch (e) {
        console.error(e);
        return new Response(e.message);
    }
};

export const config = {runtime: "edge"};
