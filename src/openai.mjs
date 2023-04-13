export const sanitizeMessages = messages => {
    const map = ({role, content} = {}) => ({role, content});
    const filter = ({role, content} = {}) => role && content;
    return messages.map(map).filter(filter);
}

export const setSystem = (content = "", messages = []) => {
    let system = messages.find(({role} = {}) => role === "system");
    if (!system) messages.unshift(system = {});
    return Object.assign(system, {role: "system", content});
}

export default class OpenAI {
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
            max_tokens = 1000,
            model = "gpt-3.5-turbo",
            path = "chat/completions",
            messages = [
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
        const body = JSON.stringify({
            model,
            max_tokens,
            messages: sanitizeMessages(messages),
        });
        const response = await fetch(url, {method: "post", headers, body});
        const data = await response.json();
        if (!response.ok) throw data.error || data;
        return data;
    }
}
