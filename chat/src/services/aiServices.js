import axios from 'axios';

export const AI_PROVIDERS = {
  OPENAI: 'openai',
  DEEPSEEK: 'deepseek'
};

// Create a configured axios instance
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? process.env.REACT_APP_API_URL_PROD
    : 'http://127.0.0.1:8000/api',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

const createChatCompletion = async (
  messages, 
  provider = AI_PROVIDERS.OPENAI, 
  parameters = {}, 
  language = 'en',
  bioBotResponseIds = []
) => {
  try {
    console.log('Sending request with language:', language);
    const response = await api.post('/chat', {
      messages,
      provider,
      parameters,
      language,
      bioBotResponseIds
    });

    // Add response data logging
    console.log('Raw API Response:', response.data);

    // If the response contains HTML error messages, extract the JSON part
    let jsonData = response.data;
    if (typeof response.data === 'string' && response.data.includes('{')) {
      const jsonStart = response.data.indexOf('{');
      const jsonEnd = response.data.lastIndexOf('}') + 1;
      try {
        jsonData = JSON.parse(response.data.slice(jsonStart, jsonEnd));
      } catch (e) {
        console.error('Failed to parse JSON from response:', e);
        throw new Error('Invalid JSON in response');
      }
    }

    console.log('Parsed Response Data:', jsonData);

    // Check if jsonData has the expected properties
    if (!jsonData || (!jsonData.messages && !jsonData.bioBotResponseIds)) {
      console.error('Invalid response structure:', jsonData);
      throw new Error('Invalid response structure from server');
    }

    return {
      messages: jsonData.messages || [],
      bioBotResponseIds: jsonData.bioBotResponseIds || []
    };
  } catch (error) {
    console.error('Chat API Error:', error.response?.data || error);
    throw error;
  }
};

export default createChatCompletion;
