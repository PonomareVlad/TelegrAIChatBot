import {promisify} from "util";
import bot from "../src/bot.mjs";
import {webhookCallback} from "grammy";

const SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";
const WRONG_TOKEN_ERROR = "secret token is wrong";
const wait = promisify((a, f) => setTimeout(f, a));
const ok = () => new Response(null, {status: 200});
const okJson = (json) => new Response(json, {
    status: 200,
    headers: {"Content-Type": "application/json"},
});
const unauthorized = () => new Response('"unauthorized"', {
    status: 401,
    statusText: WRONG_TOKEN_ERROR,
});

const stdHttp = (req, ctx) => {
    let resolveResponse;
    const waitLimit = 85_000;
    const requestLimit = 55_000;
    ctx.waitUntil(wait(waitLimit));
    const timeout = setTimeout(() => resolveResponse(ok()), requestLimit);
    return {
        update: req.json(),
        header: req.headers.get(SECRET_HEADER) || undefined,
        end: () => {
            if (resolveResponse)
                resolveResponse(ok());
        },
        respond: (json) => {
            if (resolveResponse)
                resolveResponse(okJson(json));
        },
        unauthorized: () => {
            if (resolveResponse)
                resolveResponse(unauthorized());
        },
        handlerReturn: new Promise((resolve) => {
            resolveResponse = resolve;
        }).finally(() => clearTimeout(timeout)),
    };
};

export default webhookCallback(bot, stdHttp, "throw", 85_000);

export const config = {runtime: "edge"};
