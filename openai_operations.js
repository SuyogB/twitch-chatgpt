import { GoogleGenerativeAI } from "@google/generative-ai";

export class GoogleGenerativeAIOperations {
    constructor(file_context, openai_key, model_name, history_length) {
        this.messages = [{role: "system", content: file_context}];
        this.genAI  = new GoogleGenerativeAI({apiKey: openai_key});
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

            const model = this.genAI.getGenerativeModel({ model: this.model_name });
            const response = await model.generateContent({
                prompt: text,
                generationConfig: {
                    temperature: 1,
                    maxOutputTokens: 256,
                    topP: 1,
                    frequencyPenalty: 0,
                    presencePenalty: 0,
                }
            });

            const textResponse = await response.text();
            if (textResponse) {
                console.log(`Agent Response: ${textResponse}`);
                this.messages.push({role: "assistant", content: textResponse});
                return textResponse;
            } else {
                throw new Error("No response text from OpenAI");
            }
        } catch (error) {
            console.error(error);
            return "Sorry, something went wrong. Please try again later.";
        }
    }

    async make_geminiai_call_completion(text) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "embedding-001" });
            const response = await model.generateContent({
                prompt: text,
                generationConfig: {
                    temperature: 1,
                    maxOutputTokens: 256,
                    topP: 1,
                    frequencyPenalty: 0,
                    presencePenalty: 0,
                }
            });

            const textResponse = await response.text();
            if (textResponse) {
                console.log(`Agent Response: ${textResponse}`);
                return textResponse;
            } else {
                throw new Error("No response text from OpenAI");
            }
        } catch (error) {
            console.error(error);
            return "Sorry, something went wrong. Please try again later.";
        }
    }
}
