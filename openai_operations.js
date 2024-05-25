import { GoogleGenerativeAI } from "@google/generative-ai";

export class GoogleGenerativeAIOperations {
    constructor(file_context, openai_key, model_name, history_length) {
        this.messages = [{role: "system", content: file_context}];
        this.genAI = new GoogleGenerativeAI({
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
            // Add user message to messages
            this.messages.push({role: "user", content: text});

            // Check if message history is exceeded
            this.check_history_length();

            // Generate content
            const response = await this.genAI.generateContent({
                prompt: this.messages,
                generationConfig: {
                    temperature: 1,
                    maxOutputTokens: 256,
                    topP: 1,
                    frequencyPenalty: 0,
                    presencePenalty: 0,
                },
            });

            // Extract text response
            const textResponse = response.responses[0].text;
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
}
