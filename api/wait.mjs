import {promisify} from "util";

export const config = {runtime: "edge"};

const setTimeoutAsync = promisify((a, f) => setTimeout(f, a));

export default async ({url}, ctx) => {
    let seconds = parseInt(new URL(url).searchParams.get("seconds") || 1);
    ctx.waitUntil((async () => {
        await setTimeoutAsync(1000);
        while (seconds-- > 0) {
            await setTimeoutAsync(1000);
            console.log(seconds);
        }
    })());
    return new Response(String(seconds));
}
