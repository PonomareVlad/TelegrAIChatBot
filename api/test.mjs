import {promisify} from "util";

export const config = {runtime: "edge"};

const setTimeoutAsync = promisify((a, f) => setTimeout(f, a));

export default async ({url}) => {
    const start = Date.now();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start: controller => controller.enqueue(encoder.encode("")),
        async pull(controller) {
            await setTimeoutAsync(new URL(url).searchParams.get("delay") || 0);
            const json = JSON.stringify({time: Date.now() - start});
            controller.enqueue(encoder.encode(json));
            return controller.close();
        },
    });
    return new Response(stream);
}
