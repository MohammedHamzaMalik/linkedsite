const { HuggingFaceInference } = require('@langchain/community/llms/hf');
const { PromptTemplate } = require('@langchain/core/prompts');
require('dotenv').config();

// Initialize HuggingFace model with better parameters
const model = new HuggingFaceInference({
  model: "mistralai/Mixtral-8x7B-Instruct-v0.1",  // Using a more capable model
  apiKey: process.env.HUGGINGFACEHUB_API_KEY,
  temperature: 0.5, // Lower temperature for more focused outputs
  maxTokens: 150,  // Limit output length
  topP: 0.9,
  repetitionPenalty: 1.2,
  stopSequences: ["Name:", "Email:", "About Me:", "\n\n"],
  retryOnError: true
});

// Updated prompt template with better structure
const aboutMePrompt = PromptTemplate.fromTemplate(`
You are a professional biography writer. Write a brief, engaging 'About Me' section for:
Name: {name}
Email: {email}

Requirements:
1. Write exactly one paragraph
2. Be professional and engaging
3. Focus only on creating a general introduction
4. Do not include the email in the text
5. Do not generate multiple variations
6. Do not include "About Me:" in the response
7. Keep it between 50-75 words

Response:`);

async function generateAiEnhancedContent(profileData) {
  try {
    if (!profileData?.name) {
      throw new Error('Profile name is required');
    }

    const prompt = await aboutMePrompt.format({
      name: profileData.name,
      email: profileData.email || 'Available on request'
    });

    let response = await model.call(prompt);
    
    // Clean and validate response
    response = response
      .trim()
      .replace(/^["'\s]+|["'\s]+$/g, '') // Remove quotes and extra spaces
      .replace(/Name:.*?About Me:/gs, '') // Remove any repeated prompt
      .replace(/^About Me:\s*/i, '') // Remove "About Me:" if present
      .replace(/\n+/g, ' ') // Remove multiple newlines
      .trim();

    // Validate response length and content
    if (!response || response.length < 50 || response.includes('Name:') || response.includes('Email:')) {
      throw new Error('Invalid AI response generated');
    }

    return response;

  } catch (error) {
    console.error('AI content generation error:', error);
    
    // Fallback to template response
    return `Hello! I'm ${profileData.name}, a dedicated professional passionate about creating impactful solutions. 
            I believe in building meaningful connections and delivering value through collaboration. 
            I'm always open to discussing new opportunities and ideas in my field.`;
  }
}

module.exports = { generateAiEnhancedContent };