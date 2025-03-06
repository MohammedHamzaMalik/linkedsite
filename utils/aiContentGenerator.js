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

async function generateAiEnhancedContent(profileData, maxRetries = 3) {
  const retryDelay = (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
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

      // Improved validation
      const isValid = response &&
      response.length >= 50 &&
      response.length <= 300 &&
      response.includes(profileData.name) &&
      !response.includes('Name:') &&
      !response.includes('Email:') &&
      !response.includes('###') &&
      /[.!?]$/.test(response); // Ends with proper punctuation

      if (isValid) {
        console.log('Successfully generated valid content:', response.substring(0, 50) + '...');
        return response;
      }

      console.log('Invalid response:', {
        length: response.length,
        hasName: response.includes(profileData.name),
        firstChars: response.substring(0, 30)
      });

      throw new Error('Generated content did not meet quality requirements');

    } catch (error) {
      console.error(`Generation attempt ${attempt + 1} failed:`, error.message);
        
      if (attempt === maxRetries - 1) {
        console.log('All generation attempts failed, using fallback content');
        return generateFallbackContent(profileData);
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
    }
  }
  return generateFallbackContent(profileData);
}

function generateFallbackContent(profileData) {
  const templates = [
    `${profileData.name} is a dedicated professional who brings innovation and expertise to every project. With a strong foundation in problem-solving and collaborative leadership, they consistently deliver impactful solutions while fostering meaningful professional relationships.`,
    `As an accomplished professional, ${profileData.name} combines technical excellence with strategic thinking. Their commitment to continuous learning and innovation drives them to create lasting impact in their field while building strong collaborative partnerships.`,
    `${profileData.name} stands out as a forward-thinking professional with a passion for excellence. Their analytical approach, combined with strong leadership qualities, enables them to tackle complex challenges while fostering team success.`
  ];

  const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
  console.log('Using fallback template:', selectedTemplate.substring(0, 50) + '...');
  return selectedTemplate;
}

module.exports = { generateAiEnhancedContent };
