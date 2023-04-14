import bot from "../src/bot.mjs";
import {webhookCallback} from "grammy";

export default webhookCallback(bot, "std/http", "throw", 59000);

export const config = {runtime: "edge"};
