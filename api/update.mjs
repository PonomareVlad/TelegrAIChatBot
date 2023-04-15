import {promisify} from "util";
import bot from "../src/bot.mjs";
import {webhookCallback} from "grammy";

const wait = promisify((a, f) => setTimeout(f, a));

export default async (req, ctx) => {
    let streamController;
    const waitLimit = 85_000;
    const requestLimit = 55_000;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start: controller => {
            console.log("start");
            streamController = controller;
            controller.enqueue(encoder.encode(String("OK")));
        },
        async pull(controller) {
            console.log("pull");
            await wait(requestLimit);
            console.log("limit");
            return controller.close();
        }
    });
    const handler = webhookCallback(bot, "std/http", "return", waitLimit);
    handler(req, ctx).finally(() => {
        console.log("response");
        streamController.close();
    });
    ctx.waitUntil(wait(waitLimit));
    return new Response(stream);
};

export const config = {runtime: "edge"};
