/**
 * AI Service - Local LLM Integration
 * 
 * This service provides interface to AI models.
 */

// Configuration
const AI_BASE_URL = process.env.AI_BASE_URL || 'http://localhost:11434';
const AI_DEFAULT_MODEL = process.env.AI_DEFAULT_MODEL || 'llama3';
const DEFAULT_TEMPERATURE = 0.7;
const MAX_TOKENS = 2000;

/**
 * Initialize AI client configuration
 */
function getAIClientConfig(options = {}) {
  return {
    baseUrl: AI_BASE_URL,
    model: options.model || AI_DEFAULT_MODEL,
    temperature: options.temperature || DEFAULT_TEMPERATURE,
    numPredict: options.maxTokens || MAX_TOKENS,
  };
}

/**
 * Ask local AI a question
 * @param {string} prompt - The question or instruction
 * @param {object} options - Optional configuration
 * @returns {Promise<string>} AI response
 */
async function askLocalAI(prompt, options = {}) {
  try {
    const config = getAIClientConfig(options);
    
    console.log('[aiService] Querying AI:', {
      model: options.model || AI_DEFAULT_MODEL,
      promptLength: prompt.length
    });

    // Call AI API endpoint
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.numPredict
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}`);
    }

    const data = await response.json();
    const result = data.response || data.message?.content || '';
    
    console.log('[aiService] AI response received:', {
      responseLength: result.length
    });

    return result;
  } catch (error) {
    console.error('[aiService] Error querying AI:', error.message);
    
    // Check if AI service is running
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      throw new Error(
        'Cannot connect to AI service. Please ensure the AI service is configured and running.'
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
      model: AI_DEFAULT_MODEL,
      baseUrl: AI_BASE_URL,
      responsive: true,
      message: 'AI service is operational'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      model: AI_DEFAULT_MODEL,
      baseUrl: AI_BASE_URL,
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
  getAIClientConfig
};
