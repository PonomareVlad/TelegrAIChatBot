export default class OpenAI {
    options = {
        api: "https://api.openai.com/v1/"
    }

    constructor(options = {}) {
        if (typeof options === "string") this.options.token = options;
        else Object.assign(this.options, options);
    }

    static sanitizeMessages = messages => {
        const map = ({role, content} = {}) => ({role, content});
        const filter = ({role, content} = {}) => role && content;
        return messages.map(map).filter(filter);
    }

    async chat(options = {}) {
        const {
            api = "",
            token = "",
            system = "",
            prompt = "",
            max_tokens = 4000,
            model = "gpt-3.5-turbo",
            path = "chat/completions",
            messages = [
                {role: "system", content: system},
                {role: "user", content: prompt}
            ]
        } = {
            ...this.options,
            ...options
        };
        const url = new URL(path, api);
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
        const body = JSON.stringify({
            model,
            max_tokens,
            messages: this.constructor.sanitizeMessages(messages),
        });
        const response = await fetch(url, {method: "post", headers, body});
        const data = await response.json();
        if (!response.ok) throw data.error || data;
        return data;
    }
}
