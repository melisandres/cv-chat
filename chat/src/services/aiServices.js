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

    return {
      messages: response.data.messages,
      bioBotResponseIds: response.data.bioBotResponseIds
    };
  } catch (error) {
    console.error('Chat API Error:', error.response || error);
    throw error;
  }
};

export default createChatCompletion;
