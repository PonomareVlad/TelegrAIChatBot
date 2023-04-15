import bot from "../src/bot.mjs";
import configs from "../configs.json";

const getURL = ({
                    headers = {},
                    path = "api/hybrid",
                    header = "x-forwarded-host",
                }) => {
    const host = headers?.get(header) || process.env.VERCEL_URL;
    return new URL(path, `https://${host}`).href;
}

export default async ({headers}) => {
    const webhook = await bot.api.setWebhook(getURL({headers}));
    const commands = await bot.api.setMyCommands(configs?.commands || []);
    return new Response(JSON.stringify({webhook, commands}));
}

export const config = {runtime: "edge"};
