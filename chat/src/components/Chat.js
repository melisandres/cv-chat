import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { handleChatResponses } from '../services/aiServices.js';
import { AI_PROVIDERS } from '../services/aiServices.js';

const Chat = () => {
  const [language, setLanguage] = useState('en'); // Default to English
  const [messages, setMessages] = useState([
    { role: 'assistant', content: language === 'en' 
      ? "Hello, I am Mélisandre's CV. I've come to life in order to represent her. I can tell you about her past professional experience, her education, and her skills as a full stack developper." 
      : "Bonjour, je suis le CV de Mélisandre, donné souffle de vie pour la représenter. Je peux vous parler de ses expériences professionelles, de son éducation, et de ses compétences comme développeuse full stack." 
    },
    { role: 'assistant', content: `[Biobot] ${language === 'en' 
      ? "Pft... CVs. What do they really know anyway? I'm Mé's bio. I'm an array of facts, not like this guy, who uses artificial intelligence to pretend he's smart." 
      : "Pff... les CVs. Qu'est-ce qu'ils savent vraiment ? Je suis la bio de Mé. Je suis un ensemble de faits, pas comme lui, qui utilise l'intelligence artificielle pour prétendre être intelligent."}` 
    }
  ]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState(AI_PROVIDERS.OPENAI);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [bioBotResponseIds, setBioBotResponseIds] = useState([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await handleChatResponses(
        [...messages, userMessage],
        provider,
        {
          max_tokens: 150,
          temperature: 0.7,
        },
        language,
        bioBotResponseIds,
        setMessages,
        setBioBotResponseIds
      );
    } catch (error) {
      console.error('Error in handleSend:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: language === 'en' ? 'Sorry, I encountered an error. Please try again.' : 'Désolé, j\'ai rencontré une erreur. Veuillez réessayer.' 
      }]);
    }

    setIsLoading(false);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    if (messages.length === 2) { // Changed from 1 to 2 to account for both intro messages
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        updatedMessages[0].content = newLanguage === 'en' 
          ? "Hello, I am Mélisandre's CV. I've come to life in order to represent her. I can tell you about her past professional experience, her education, and her skills as a full stack developper." 
          : "Bonjour, je suis le CV de Mélisandre, donné souffle de vie pour la représenter. Je peux vous parler de ses expériences professionelles, de son éducation, et de ses compétences comme développeuse full stack.";
        updatedMessages[1].content = `[Biobot] ${newLanguage === 'en'
          ? "Pft... CVs. What do they really know anyway? I'm Mé's bio. I'm an array of facts, not like this guy, who uses artificial intelligence to pretend he's smart."
          : "Pff... les CVs. Qu'est-ce qu'ils savent vraiment ? Je suis la bio de Mé. Je suis un ensemble de faits, pas comme lui, qui utilise l'intelligence artificielle pour prétendre être intelligent."}`;
        return updatedMessages;
      });
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ height: '100vh', py: 2, display: 'flex', flexDirection: 'column' }}>
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <RadioGroup
            row
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <FormControlLabel value="en" control={<Radio />} label="English" />
            <FormControlLabel value="fr" control={<Radio />} label="Français" />
          </RadioGroup>
        </FormControl>

        <FormControl sx={{ mb: 2, minWidth: 120 }}>
          <InputLabel>{language === 'en' ? "AI Provider" : "Fournisseur d'IA"}</InputLabel>
          <Select
            value={provider}
            label={language === 'en' ? "AI Provider" : "Fournisseur d'IA"}
            onChange={(e) => setProvider(e.target.value)}
          >
            <MenuItem value={AI_PROVIDERS.OPENAI}>OpenAI</MenuItem>
            <MenuItem value={AI_PROVIDERS.DEEPSEEK}>DeepSeek</MenuItem>
          </Select>
        </FormControl>

        <Paper 
          elevation={3} 
          sx={{ 
            flex: 1, 
            mb: 2, 
            p: 2, 
            overflow: 'auto',
            bgcolor: '#f5f5f5' 
          }}
        >
          {messages.map((message, index) => {
            const isBiobot = message.content.startsWith('[Biobot]');
            const displayContent = isBiobot ? message.content.replace('[Biobot] ', '') : message.content;

            return (
              <Box 
                key={index}
                sx={{
                  mb: 2,
                  textAlign: message.role === 'user' ? 'right' : 'left'
                }}
              >
                <Typography
                  sx={{
                    display: 'inline-block',
                    bgcolor: message.role === 'user' 
                      ? '#e3f2fd' 
                      : isBiobot
                          ? '#f3e5f5'  // Light purple for biobot
                          : '#fff',    // White for assistant
                    p: 1,
                    borderRadius: 1,
                    maxWidth: '70%'
                  }}
                >
                  {displayContent}
                </Typography>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Paper>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <Button 
            variant="contained" 
            onClick={handleSend}
            disabled={isLoading}
          >
            {language === 'en' ? 'Send' : 'Soumettre'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Chat;
