import {promisify} from "util";

export const config = {runtime: "edge"};

const setTimeoutAsync = promisify((a, f) => setTimeout(f, a));

export default async ({url}, ctx) => {
    const encoder = new TextEncoder();
    let time = 0;
    let limit = 55;
    let seconds = parseInt(new URL(url).searchParams.get("seconds") || 100);
    const stream = new ReadableStream({
        start: controller => controller.enqueue(encoder.encode(String(seconds))),
        async pull(controller) {
            time++;
            if (time > seconds) return controller.close();
            await setTimeoutAsync(1000);
            console.log(time);
            void (fetch("https://edge.requestcatcher.com/" + time));
            if (time < limit) return controller.enqueue(encoder.encode(":" + time));
            ctx.waitUntil((async () => {
                while (time++ < seconds) {
                    await setTimeoutAsync(1000);
                    void (fetch("https://edge.requestcatcher.com/" + time));
                    console.log(time);
                }
            })());
            return controller.close();
        }
    });
    return new Response(stream);
}
