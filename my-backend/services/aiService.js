/**
 * AI Service - Local LLM Integration with Ollama
 * 
 * This service provides interface to local AI models (Mistral, Llama 3, etc.)
 * running via Ollama. Fully offline and free.
 * 
 * Prerequisites:
 * 1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh
 * 2. Pull model: ollama pull mistral (or llama3)
 * 3. Ensure Ollama is running: ollama serve
 */

const { Ollama } = require('langchain/llms/ollama');

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const DEFAULT_TEMPERATURE = 0.7;
const MAX_TOKENS = 2000;

/**
 * Initialize Ollama client
 */
function getOllamaClient(options = {}) {
  return new Ollama({
    baseUrl: OLLAMA_BASE_URL,
    model: options.model || OLLAMA_MODEL,
    temperature: options.temperature || DEFAULT_TEMPERATURE,
    numPredict: options.maxTokens || MAX_TOKENS,
  });
}

/**
 * Ask local AI a question
 * @param {string} prompt - The question or instruction
 * @param {object} options - Optional configuration
 * @returns {Promise<string>} AI response
 */
async function askLocalAI(prompt, options = {}) {
  try {
    const model = getOllamaClient(options);
    
    console.log('[aiService] Querying local AI:', {
      model: options.model || OLLAMA_MODEL,
      promptLength: prompt.length
    });

    const response = await model.invoke(prompt);
    
    console.log('[aiService] AI response received:', {
      responseLength: response.length
    });

    return response;
  } catch (error) {
    console.error('[aiService] Error querying AI:', error.message);
    
    // Check if Ollama is running
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      throw new Error(
        'Cannot connect to Ollama. Please ensure Ollama is installed and running:\n' +
        '1. Install: curl -fsSL https://ollama.com/install.sh | sh\n' +
        '2. Pull model: ollama pull mistral\n' +
        '3. Start service: ollama serve'
      );
    }
    
    throw error;
  }
}

/**
 * Generate structured ERP insights from data
 * @param {object} context - ERP data context
 * @param {string} analysisType - Type of analysis (sales, inventory, fuel, etc.)
 * @returns {Promise<string>} Structured insights
 */
async function generateERPInsights(context, analysisType = 'general') {
  const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
  
  const systemPrompt = `You are an AI assistant specialized in ERP analytics for petrol pump and business management.
Analyze the following data and provide actionable insights.

Data to analyze:
${contextStr}

Analysis type: ${analysisType}

Please provide:
1. Key metrics summary
2. Trends and patterns
3. Anomalies or concerns
4. Predictions for next period
5. Actionable recommendations

Keep your response concise, structured, and business-focused.`;

  return await askLocalAI(systemPrompt);
}

/**
 * Generate SQL query from natural language
 * @param {string} question - Natural language question
 * @param {string} schemaInfo - Database schema information
 * @returns {Promise<string>} SQL query
 */
async function generateSQLQuery(question, schemaInfo = '') {
  const prompt = `You are a PostgreSQL expert. Convert this natural language question into a SQL query.

Database schema information:
${schemaInfo}

Question: ${question}

Provide only the SQL query without explanation. Use PostgreSQL syntax.`;

  return await askLocalAI(prompt, { temperature: 0.3 }); // Lower temperature for code generation
}

/**
 * Summarize conversation or report
 * @param {string} text - Text to summarize
 * @param {number} maxLength - Maximum summary length
 * @returns {Promise<string>} Summary
 */
async function summarizeText(text, maxLength = 200) {
  const prompt = `Summarize the following text in ${maxLength} words or less. Focus on key points and actionable items.

Text:
${text}

Summary:`;

  return await askLocalAI(prompt, { temperature: 0.5, maxTokens: 500 });
}

/**
 * Health check for AI service
 * @returns {Promise<object>} Service status
 */
async function healthCheck() {
  try {
    const testPrompt = 'Reply with "OK" if you can read this.';
    const response = await askLocalAI(testPrompt, { maxTokens: 50 });
    
    return {
      status: 'healthy',
      model: OLLAMA_MODEL,
      baseUrl: OLLAMA_BASE_URL,
      responsive: true,
      message: 'AI service is operational'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      model: OLLAMA_MODEL,
      baseUrl: OLLAMA_BASE_URL,
      responsive: false,
      error: error.message,
      message: 'AI service is not available'
    };
  }
}

module.exports = {
  askLocalAI,
  generateERPInsights,
  generateSQLQuery,
  summarizeText,
  healthCheck,
  getOllamaClient
};
