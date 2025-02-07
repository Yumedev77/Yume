import { Message } from '../types';

const API_URL = "your-api-url"
const API_KEY = "your-aoi-key";

export async function generateAIResponse(messages: Message[]): Promise<string> {
  try {
    // Build conversation history
    const conversationContext = messages
      .slice(-5) // Get last 5 messages for context
      .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    // Add the current conversation context
    const prompt = `Previous conversation:\n${conversationContext}\n\nHuman: ${messages[messages.length - 1].content}\n\nAssistant:`;
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the generated text and clean it up
    let generatedText = data[0]?.generated_text || "";
    
    // Remove the input prompt from the response if it's included
    if (generatedText.startsWith(prompt)) {
      generatedText = generatedText.slice(prompt.length).trim();
    }
    
    // If we got a valid response, return it
    if (generatedText) {
      return generatedText;
    }

    // Fallback for empty response
    return "I apologize, but I couldn't generate a complete response. Could you please rephrase your question?";

  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Fallback responses for critical functionality
    const lastMessage = messages[messages.length - 1];
    
    // Identity questions
    const identityKeywords = ['who are you', 'what are you', 'your name', 'who created you'];
    if (identityKeywords.some(keyword => lastMessage.content.toLowerCase().includes(keyword))) {
      return "I am nijiAI, your friendly assistant. How can I help you today?";
    }

    // Common questions (as fallback)
    if (lastMessage.content.toLowerCase().includes('most powerful ai')) {
      return `As of 2024, some of the most powerful AI systems include:

1. GPT-4 by OpenAI - Known for its advanced language understanding and generation capabilities
2. Claude 2 by Anthropic - Recognized for its reasoning and analysis abilities
3. PaLM 2 by Google - Excels in multilingual tasks and coding
4. DALL-E 3 - Leading in image generation
5. Gemini by Google - Advanced multimodal capabilities

However, "most powerful" is subjective and depends on the specific task or application. Each system has its own strengths in different areas like language processing, reasoning, coding, or multimodal tasks.`;
    }

    return "I apologize, but I'm having trouble connecting to my services right now. Could you please try again in a moment?";
  }
}