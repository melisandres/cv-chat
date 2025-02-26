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
  const [usedQuestionIndices, setUsedQuestionIndices] = useState([]); // Track used question indices
  const [questionPage, setQuestionPage] = useState(0);
  const questionsPerPage = 3;

  const englishQuestions = [
    "Describe Mélisandre's work experience.",
    "Where can I see her work?",
    "Sum up Mélisandre in 10 words.",
    "A Haiku cv poem?",
    "How do you think Mélisandre might fit into our development team?",
    "What projects best showcase Mélisandre's versatility?",
    "What is Mélisandre's key strength?",
    "Can you tell me about yourself?",
    "Tell me about Mélisandre's education.",
    "What might Mélisandre say is her greatest achievement?",
    "Describe Mélisandre's work style.",
    "What do I keep hearing about narrative and why?",
  ];

  const frenchQuestions = [
    "Parlez-moi de l'expérience de travail de Mélisandre.",
    "Où puis-je voir son travail?",
    "Résumez Mélisandre en 10 mots.",
    "Un poème haïku sur le cv?",
    "Comment pensez-vous que Mélisandre pourrait s'intégrer dans notre équipe de développement?",
    "Quels projets montrent le mieux la polyvalence de Mélisandre?",
    "Quelle est la force clé de Mélisandre?",
    "Parlez-moi de vous-même.",
    "Que pensez-vous que Mélisandre dirait de son plus grand accomplissement?",
    "Décrivez le style de travail de Mélisandre.",
    "Mélisandre semble-t-elle plus à l'aise sur le front-end ou sur le back-end?",
    "Pourquoi parlez-vous de la narration?",
  ];

  const [potentialQuestions, setPotentialQuestions] = useState(englishQuestions);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Update potential questions when language changes, excluding used questions
    const availableQuestions = language === 'en' 
      ? englishQuestions.filter((_, index) => !usedQuestionIndices.includes(index))
      : frenchQuestions.filter((_, index) => !usedQuestionIndices.includes(index));
    
    setPotentialQuestions(availableQuestions);
  }, [language, usedQuestionIndices]);

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

  const handleQuestionClick = async (question) => {
    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
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
      ).finally(() => setIsLoading(false));
    } catch (error) {
      console.error('Error in handleQuestionClick:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: language === 'en' ? 'Sorry, I encountered an error. Please try again.' : 'Désolé, j\'ai rencontré une erreur. Veuillez réessayer.' 
      }]);
    }

    // Find the index of the question in the current language array
    const questionIndex = language === 'en' 
      ? englishQuestions.indexOf(question) 
      : frenchQuestions.indexOf(question);
    
    if (questionIndex !== -1 && !usedQuestionIndices.includes(questionIndex)) {
      // Add this index to used questions
      setUsedQuestionIndices(prev => [...prev, questionIndex]);
    }
  };


  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    
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

  const handleNextQuestions = () => {
    const maxPage = Math.ceil(potentialQuestions.length / questionsPerPage) - 1;
    setQuestionPage(prev => Math.min(prev + 1, maxPage));
  };

  const handlePrevQuestions = () => {
    setQuestionPage(prev => Math.max(prev - 1, 0));
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
              <FormControlLabel value="en" control={<Radio />} label="En" />
              <FormControlLabel value="fr" control={<Radio />} label="Fr" />
            </RadioGroup>
          </FormControl>

{/*           <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>{language === 'en' ? "AI Provider" : "Fournisseur d'IA"}</InputLabel>
            <Select
              value={provider}
              label={language === 'en' ? "AI Provider" : "Fournisseur d'IA"}
              onChange={(e) => setProvider(e.target.value)}
            >
              <MenuItem value={AI_PROVIDERS.OPENAI}>OpenAI</MenuItem>
              <MenuItem value={AI_PROVIDERS.DEEPSEEK}>DeepSeek</MenuItem>
            </Select>
          </FormControl> */}
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
                      mt: 4,
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
                        bgcolor: isBiobot ? '#f3e5f5' : '#fff',
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

        {/* Modified Questions Section with Navigation Arrows */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'row', 
          gap: 1, 
          mt: 2, 
          alignItems: 'center',
          width: '100%',
          px: { xs: 0, sm: 0 }, // Remove any horizontal padding at small sizes
          mx: 0 // Ensure no margin is applied
        }}>
          <Button 
            onClick={handlePrevQuestions}
            disabled={questionPage === 0 || potentialQuestions.length <= questionsPerPage}
            sx={{ 
              minWidth: { xs: '30px', sm: '35px' }, 
              p: { xs: 0.5, sm: 1 },
              flex: '0 0 auto' // Prevent shrinking
            }}
          >
            ←
          </Button>
          
          <Box sx={{ 
            display: 'flex', 
            flex: 1, 
            gap: 1, 
            justifyContent: 'space-between',
            width: '100%',
            overflow: 'hidden' // Prevent overflow
          }}>
            {potentialQuestions
              .slice(questionPage * questionsPerPage, (questionPage + 1) * questionsPerPage)
              .map((question, index) => (
                <Button 
                  key={index} 
                  variant="outlined" 
                  onClick={() => handleQuestionClick(question)}
                  sx={{ 
                    flex: 1,
                    minWidth: 0, // Allow buttons to shrink below their content size
                    whiteSpace: 'normal', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontSize: 'clamp(0.2rem, 0.4vw + 0.4rem, 0.8rem)',
                    px: { xs: 0.5, sm: 1 }, // Reduce padding on small screens
                  }} 
                >
                  {question}
                </Button>
              ))}
              
            {potentialQuestions.length < questionsPerPage && 
              Array(questionsPerPage - potentialQuestions.length).fill(0).map((_, i) => (
                <Box key={i} sx={{ flex: 1 }} />
              ))
            }
          </Box>
          
          <Button 
            onClick={handleNextQuestions}
            disabled={
              questionPage >= Math.ceil(potentialQuestions.length / questionsPerPage) - 1 || 
              potentialQuestions.length <= questionsPerPage
            }
            sx={{ 
              minWidth: { xs: '30px', sm: '40px' }, 
              p: { xs: 0.5, sm: 1 },
              flex: '0 0 auto' // Prevent shrinking
            }}
          >
            →
          </Button>
        </Box>
        
        {/* Page indicator */}
{/*         {potentialQuestions.length > questionsPerPage && (
          <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
            {language === 'en' ? '? prefab ?' : '? toutes faites ?'} {questionPage + 1} / {Math.ceil(potentialQuestions.length / questionsPerPage)}
          </Typography>
        )} */}
      </Box>
    </Container>
  );
};

export default Chat;
