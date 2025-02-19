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

// Define constants for messages
const CV_INTRO_1 = {
  en: "Hello, I am Mélisandre's CV. I've come to life in order to represent her.",
  fr: "Bonjour, je suis le CV de Mélisandre, donné souffle de vie pour la représenter."
};

const BIOBOT_INTRO = {
  en: "Pft... CVs. What do they really know anyway? I'm Mé's bio. I'm an array of facts, not like this guy, who uses artificial intelligence to pretend he's smart.",
  fr: "Pff... les CVs. Qu'est-ce qu'ils savent vraiment? Je suis la bio de Mé. Je suis un ensemble de faits, pas comme lui, qui utilise l'intelligence artificielle pour prétendre être intelligent."
};

const CV_INTRO_2 = {
  en: "Don't be fooled, bios are not serious. I can tell you about her past professional experience, her education, and her skills as a full stack developer.",
  fr: "Une bio, c'est pas sérieux. Moi, je peux vous parler de ses expériences professionelles, de son éducation, et de ses compétences comme développeuse full stack."
};

const Chat = () => {
  const [language, setLanguage] = useState('en'); // Default to English
  const [messages, setMessages] = useState([
    { role: 'assistant', content: CV_INTRO_1[language] },
    { role: 'assistant', content: `[Biobot] ${BIOBOT_INTRO[language]}` },
    { role: 'assistant', content: CV_INTRO_2[language] }
  ]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState(AI_PROVIDERS.OPENAI);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [bioBotResponseIds, setBioBotResponseIds] = useState([]);

  const englishQuestions = [
    "Please tell me about Mélisandre's experience as a fullstack developer.",
    "How do you think Mélisandre might fit into our development team?",
    "What projects best showcase Mélisandre's versatility?",
    "What is Mélisandre's key strength?",
    "What is Mélisandre's favorite programming language?",
    "What is Mélisandre's favorite framework?",
    "What is Mélisandre's favorite database?",
    "What is Mélisandre's favorite IDE?",
  ];

  const frenchQuestions = [
    "Parlez-moi de l'expérience de Mélisandre en tant que développeuse fullstack.",
    "Comment pensez-vous que Mélisandre pourrait s'intégrer dans notre équipe de développement ?",
    "Quels projets montrent le mieux la polyvalence de Mélisandre ?",
    "Quelle est la force clé de Mélisandre ?",
    "Quelle est la langue de programmation favorite de Mélisandre ?",
    "Quel est le framework favorite de Mélisandre ?",
    "Quel est la base de données favorite de Mélisandre ?",
    "Quel est l'IDE favorite de Mélisandre ?",
  ];

  const [potentialQuestions, setPotentialQuestions] = useState(englishQuestions);

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
    setPotentialQuestions(newLanguage === 'en' ? englishQuestions : frenchQuestions);
    if (messages.length === 3) {
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        updatedMessages[0].content = CV_INTRO_1[newLanguage];
        updatedMessages[1].content = `[Biobot] ${BIOBOT_INTRO[newLanguage]}`;
        updatedMessages[2].content = CV_INTRO_2[newLanguage];
        return updatedMessages;
      });
    }
  };

  const handleQuestionClick = (question) => {
    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    handleChatResponses(
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
    ).finally(() => setIsLoading(false));

    const questionIndex = potentialQuestions.indexOf(question);
    if (questionIndex !== -1) {
      const newQuestions = [...potentialQuestions];
      newQuestions.splice(questionIndex, 1);

      // Remove the equivalent question from the other language array
      if (language === 'en') {
        frenchQuestions.splice(questionIndex, 1);
      } else {
        englishQuestions.splice(questionIndex, 1);
      }

      setPotentialQuestions(newQuestions);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ height: 'calc(100vh - 35px)', py: 2, display: 'flex', flexDirection: 'column' }}>
        
        {/* Aligning AI and Language Selectors Side by Side */}
        <Box sx={{ display: 'flex', mb: 2, gap: 2 }}>
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <FormControlLabel value="en" control={<Radio />} label="English" />
              <FormControlLabel value="fr" control={<Radio />} label="Français" />
            </RadioGroup>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
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
        </Box>

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
            const label = message.role === 'user' ? 'User' : isBiobot ? 'Bio' : 'CV';

            return (
              <Box 
                key={index}
                sx={{
                  mb: 2,
                  textAlign: message.role === 'user' ? 'center' : (isBiobot ? 'right' : 'left'),
                }}
              >
                {message.role === 'user' ? (
                  <Typography
                    sx={{
                      fontStyle: 'italic',
                      fontSize: '1.5rem',
                      color: 'grey',
                      textTransform: 'uppercase',
                      maxWidth: '70%',
                      display: 'inline-block',
                      mt: 2,
                    }}
                  >
                    {displayContent}
                  </Typography>
                ) : (
                  <>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        display: 'inline-block',
                        bgcolor: message.role === 'user' 
                          ? '#e3f2fd' 
                          : isBiobot
                              ? '#f3e5f5'
                              : '#fff',
                        p: 1,
                        borderRadius: 1,
                        maxWidth: '70%'
                      }}
                    >
                      {displayContent}
                    </Typography>
                  </>
                )}
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

        {/* Adding a Section for Potential Questions */}
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
          {potentialQuestions.slice(0, 3).map((question, index) => (
            <Button 
              key={index} 
              variant="outlined" 
              onClick={() => handleQuestionClick(question)}
            >
              {question}
            </Button>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default Chat;
