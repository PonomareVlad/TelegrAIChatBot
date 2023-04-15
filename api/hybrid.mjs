import {promisify} from "util";

export const config = {runtime: "edge"};

const setTimeoutAsync = promisify((a, f) => setTimeout(f, a));

export default async ({url}, ctx) => {
    let wait;
    let time = 0;
    const limit = 30;
    const seconds = parseInt(new URL(url).searchParams.get("seconds") || 100);
    const streamPromise = new Promise(function (resolve, reject) {
        wait = {resolve: resolve, reject: reject};
    });
    setInterval(() => time++, 1000);
    ctx.waitUntil((async () => {
        await streamPromise;
        while (time <= seconds) {
            await setTimeoutAsync(1000);
            void (fetch("https://edge.requestcatcher.com/wait/" + time));
            console.log(time);
        }
    })());
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start: controller => controller.enqueue(encoder.encode(String(seconds))),
        async pull(controller) {
            if (time >= seconds) return controller.close();
            await setTimeoutAsync(1000);
            void (fetch("https://edge.requestcatcher.com/stream/" + time));
            controller.enqueue(encoder.encode(":" + time));
            if (time >= limit) return controller.close(wait.resolve());
        }
    });
    return new Response(stream);
}
