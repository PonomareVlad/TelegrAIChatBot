import {init, Tiktoken} from "@dqbd/tiktoken/lite/init";
import model from "@dqbd/tiktoken/encoders/cl100k_base.json";
import wasm from "@dqbd/tiktoken/lite/tiktoken_bg.wasm?module";

const special_tokens = {
    "<|im_end|>": 100265,
    "<|im_sep|>": 100266,
    "<|im_start|>": 100264,
}

export async function initEncoder() {
    if (globalThis.encoder) return globalThis.encoder;
    const tokens = {...model.special_tokens, ...special_tokens};
    await init((imports) => WebAssembly.instantiate(wasm, imports));
    return globalThis.encoder = new Tiktoken(model.bpe_ranks, tokens, model.pat_str);
}

export function getChatGPTEncoding(messages = [], model = "gpt-3.5-turbo") {
    const isGpt3 = model === "gpt-3.5-turbo";
    const msgSep = isGpt3 ? "\n" : "";
    const roleSep = isGpt3 ? "\n" : "<|im_sep|>";
    const map = ({name, role, content}) => `<|im_start|>${name || role}${roleSep}${content}<|im_end|>`;
    return [messages.map(map).join(msgSep), `<|im_start|>assistant${roleSep}`].join(msgSep);
}

export const sanitizeMessages = messages => {
    const map = ({role, content} = {}) => ({role, content});
    const filter = ({role, content} = {}) => role && content;
    return messages.map(map).filter(filter);
}

export const trimMessages = ({encoder, model, messages = [], minTokens = 1, maxTokens = 4096} = {}) => {
    const isSystem = ({role} = {}) => role === "system";
    const notSystem = ({role} = {}) => role !== "system";
    const trimNeeded = () => maxTokens - chatTokens({model, encoder, messages}) < minTokens;
    while (messages.filter(notSystem).length && trimNeeded()) {
        const system = messages.find(isSystem);
        if (system) messages.splice(messages.indexOf(system), 1);
        messages.shift();
        if (system) messages.unshift(system);
    }
    return messages;
}

export const chatTokens = ({encoder, model, messages = []} = {}) => {
    const targetMessages = sanitizeMessages(messages);
    const encodedMessages = getChatGPTEncoding(targetMessages, model);
    return encoder.encode(encodedMessages, "all").length;
}

export const setSystem = (content = "", messages = []) => {
    let system = messages.find(({role} = {}) => role === "system");
    if (!system) messages.unshift(system = {});
    return Object.assign(system, {role: "system", content});
}

export class API {

    options = {
        api: "https://api.openai.com/v1/"
    }

    constructor(options = {}) {
        if (typeof options === "string") this.options.token = options;
        else Object.assign(this.options, options);
    }

    async chat(options = {}) {
        const {
            api = "",
            token = "",
            system = "",
            prompt = "",
            minTokens = 512,
            maxTokens = 4096,
            model = "gpt-3.5-turbo",
            path = "chat/completions",
            messages: rawMessages = [
                {role: "user", content: prompt}
            ]
        } = {
            ...this.options,
            ...options
        };
        if (system) setSystem(system, messages);
        const url = new URL(path, api);
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
        const encoder = await initEncoder();
        const messages = trimMessages({model, encoder, maxTokens, minTokens, messages: rawMessages});
        const max_tokens = maxTokens - chatTokens({model, encoder, messages});
        const body = JSON.stringify({model, max_tokens, messages});
        const response = await fetch(url, {method: "post", headers, body});
        const data = await response.json();
        if (!response.ok) throw data.error || data;
        return data;
    }

}

export default API;
