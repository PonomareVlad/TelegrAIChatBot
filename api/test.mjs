import {promisify} from "util";

export const config = {runtime: "edge"};

const setTimeoutAsync = promisify((a, f) => setTimeout(f, a));

export default async ({url}) => {
    const start = Date.now();
    const encoder = new TextEncoder();
    const delay = new URL(url).searchParams.get("delay") || 0;
    const stream = new ReadableStream({
        start: controller => controller.enqueue(encoder.encode(delay + ":")),
        async pull(controller) {
            await setTimeoutAsync(delay);
            controller.enqueue(encoder.encode(String(Date.now() - start)));
            await setTimeoutAsync(1000);
            return controller.close();
        }
    });
    return new Response(stream);
}
