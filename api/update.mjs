import {promisify} from "util";
import bot from "../src/bot.mjs";
import {webhookCallback} from "grammy";

export const config = {runtime: "edge"};

const wait = promisify((a, f) => setTimeout(f, a));

function edgeStream(bot, adapter = "std/http", onTimeout = "return", timeoutMilliseconds = 180_000) {
    const callback = webhookCallback(bot, adapter, onTimeout, timeoutMilliseconds);
    const encoder = new TextEncoder();
    return (...args) => {
        let streamController;
        const stream = new ReadableStream({
            start: controller => streamController = controller,
            pull: controller => wait(1000).then(() => controller.enqueue(encoder.encode(".")))
        });
        callback(...args).finally(() => streamController.close());
        return new Response(stream);
    }
}

export default edgeStream(bot);
