import axios from 'axios';

export const AI_PROVIDERS = {
  OPENAI: 'openai',
  DEEPSEEK: 'deepseek'
};

// Create a configured axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api',
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

const extractJsonData = (responseData) => {
  let jsonData = responseData;
  if (typeof responseData === 'string' && responseData.includes('{')) {
    const jsonStart = responseData.indexOf('{');
    const jsonEnd = responseData.lastIndexOf('}') + 1;
    try {
      jsonData = JSON.parse(responseData.slice(jsonStart, jsonEnd));
    } catch (e) {
      console.error('Failed to parse JSON from response:', e);
      throw new Error('Invalid JSON in response');
    }
  }
  return jsonData;
};

export const getBiobotResponse = async (input, bioBotResponseIds = [], language = 'en') => {
  try {
    const response = await api.post('/biobot-response', {
      input,
      bioBotResponseIds,
      language
    });

    // Use the utility function to extract JSON data
    return extractJsonData(response.data);
  } catch (error) {
    console.error('Biobot API Error:', error.response?.data || error);
    throw error;
  }
};

export const getCvAiResponse = async (messages, provider = AI_PROVIDERS.OPENAI, parameters = {}, language = 'en') => {
  try {
    const response = await api.post('/cvai-response', {
      messages,
      provider,
      parameters,
      language
    });

    // Use the utility function to extract JSON data
    return extractJsonData(response.data);
  } catch (error) {
    console.error('cvAi API Error:', error.response?.data || error);
    throw error;
  }
};

export const handleChatResponses = async (
  messages, 
  provider, 
  parameters, 
  language, 
  bioBotResponseIds, 
  updateMessages, 
  updateBioBotResponseIds
) => {
  try {
    console.log('Sending request to getBiobotResponse...');
    const lastUserMessage = messages[messages.length - 1].content;
    const biobotResponse = await getBiobotResponse(lastUserMessage, bioBotResponseIds, language);

    if (biobotResponse.biobotResponse && biobotResponse.biobotResponse.content) {
      console.log('Biobot response received:', biobotResponse.biobotResponse.content);
      updateMessages(prev => [...prev, { role: 'assistant', content: `[Biobot] ${biobotResponse.biobotResponse.content}` }]);
      updateBioBotResponseIds(biobotResponse.bioBotResponseIds);
    } else {
      console.log('No valid biobot response received.');
    }

    console.log('Sending request to getCvAiResponse...');
    const cvAiResponse = await getCvAiResponse(messages, provider, parameters, language);

    if (cvAiResponse.aiResponse) {
      console.log('cvAi response received:', cvAiResponse.aiResponse);
      updateMessages(prev => [...prev, { role: 'assistant', content: cvAiResponse.aiResponse }]);
    }
  } catch (error) {
    console.error('Error in handleChatResponses:', error);
    throw error;
  }
};

export default createChatCompletion;
