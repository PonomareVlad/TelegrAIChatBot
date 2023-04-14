import bot from "../src/bot.mjs";
import config from "../config.json";

const getURL = ({
                    headers = {},
                    path = "api/update",
                    header = "x-forwarded-host",
                }) => {
    const host = headers?.get(header) || process.env.VERCEL_URL;
    return new URL(path, `https://${host}`).href;
}

export default async ({headers}) => {
    const webhook = await bot.api.setWebhook(getURL({headers}));
    const commands = await bot.api.setMyCommands(config?.commands || []);
    return new Response(JSON.stringify({webhook, commands}));
}

export const config = {runtime: "edge"};
