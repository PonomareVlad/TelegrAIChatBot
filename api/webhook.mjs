import bot from "../src/bot.mjs";
import configs from "../configs.json";

const {
    VERCEL_URL,
    PROXY_URL = "",
} = process.env;

const getURL = ({
                    headers = {},
                    path = "api/update",
                    header = "x-forwarded-host",
                }) => {
    const host = headers?.get(header) || VERCEL_URL;
    return new URL(`${PROXY_URL}https://${host}/${path}`).href;
}

export default async ({headers}) => {
    const url = getURL({headers});
    const webhook = await bot.api.setWebhook(url);
    const commands = await bot.api.setMyCommands(configs?.commands || []);
    return new Response(JSON.stringify({url, webhook, commands}));
}

export const config = {runtime: "edge"};
