const { HuggingFaceInference } = require('@langchain/community/llms/hf');
const { PromptTemplate } = require('@langchain/core/prompts');
require('dotenv').config();

// Initialize HuggingFace model
const model = new HuggingFaceInference({
  model: "gpt2-medium",
  apiKey: process.env.HUGGINGFACEHUB_API_KEY,
  temperature: 0.7,
  maxTokens: 200,
  retryOnError: true
});

// Create prompt template
const aboutMePrompt = PromptTemplate.fromTemplate(`
Generate a professional and engaging 'About Me' section for a portfolio website.
Name: {name}
Email: {email}
Context: This is for a professional portfolio website.

Write a brief, professional paragraph about this person that:
- Introduces them by name
- Maintains a professional tone
- Emphasizes their approachability
- Encourages professional connections
- Is between 50-100 words

About Me:`);

async function generateAiEnhancedContent(profileData) {
  try {
    const prompt = await aboutMePrompt.format({
      name: profileData.name || 'Professional',
      email: profileData.email || 'Available on request'
    });

    const response = await model.call(prompt);

    return response
      .trim()
      .replace(/^["'\s]+|["'\s]+$/g, '');

  } catch (error) {
    console.error('AI content generation error:', error);
    return `Hello! I'm ${profileData.name}, and I'm passionate about creating impactful solutions 
            and bringing value to organizations. Feel free to connect with me to discuss potential 
            opportunities or collaborations.`;
  }
}

module.exports = { generateAiEnhancedContent };