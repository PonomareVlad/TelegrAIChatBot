import {promisify} from "util";

const setTimeoutAsync = promisify((a, f) => setTimeout(f, a));

export const config = {runtime: "edge"};

export default async ({url}) => {
    const start = Date.now();
    await setTimeoutAsync(new URL(url).searchParams.get("delay") || 0);
    return new Response(JSON.stringify({time: Date.now() - start}));
}
