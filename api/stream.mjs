import {promisify} from "util";

export const config = {runtime: "edge"};

const setTimeoutAsync = promisify((a, f) => setTimeout(f, a));

export default async ({url}) => {
    const encoder = new TextEncoder();
    let seconds = parseInt(new URL(url).searchParams.get("seconds") || 100);
    const stream = new ReadableStream({
        start: controller => controller.enqueue(encoder.encode(String(seconds))),
        async pull(controller) {
            if (seconds-- < 1) return controller.close();
            await setTimeoutAsync(1000);
            console.log(seconds);
            void (fetch("https://edge.requestcatcher.com/" + seconds));
            return controller.enqueue(encoder.encode(":" + seconds));
        }
    });
    return new Response(stream);
}
