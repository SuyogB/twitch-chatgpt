import { GoogleGenerativeAI } from "@google/generative-ai";

export class GoogleGenerativeAIOperations {
    constructor(file_context, openai_key, model_name, history_length) {
        this.messages = [{role: "system", content: file_context}];
        this.genAI  = new GoogleGenerativeAI({
            apiKey: openai_key,
        });
        this.model_name = model_name;
        this.history_length = history_length;
    }

    check_history_length() {
        console.log(`Conversations in History: ${((this.messages.length / 2) - 1)}/${this.history_length}`);
        if (this.messages.length > ((this.history_length * 2) + 1)) {
            console.log('Message amount in history exceeded. Removing oldest user and agent messages.');
            this.messages.splice(1, 2);
        }
    }

    async make_geminiai_call(text) {
        try {
            this.messages.push({role: "user", content: text});
            this.check_history_length();

            const response = await this.genAI.generateMessage({
                model: this.model_name,
                messages: this.messages,
                temperature: 1,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            if (response.choices && response.choices.length > 0) {
                let agent_response = response.choices[0].message.content;
                console.log(`Agent Response: ${agent_response}`);
                this.messages.push({role: "assistant", content: agent_response});
                return agent_response;
            } else {
                throw new Error("No choices returned from OpenAI");
            }
        } catch (error) {
            console.error(error);
            return "Sorry, something went wrong. Please try again later.";
        }
    }

    async make_geminiai_call_completion(text) {
        try {
            const response = await this.genAI.generateMessage({
                model: "embedding-001",
                prompt: text,
                temperature: 1,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            if (response.choices && response.choices.length > 0) {
                let agent_response = response.choices[0].text;
                console.log(`Agent Response: ${agent_response}`);
                return agent_response;
            } else {
                throw new Error("No choices returned from OpenAI");
            }
        } catch (error) {
            console.error(error);
            return "Sorry, something went wrong. Please try again later.";
        }
    }
}
