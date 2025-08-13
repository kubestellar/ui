import { useState } from 'react';
import ChatbotComponent from './Chatbot';
import './ChatbotLauncher.css';
import { Chat as ChatIcon } from '@mui/icons-material';
import useTheme from '../../stores/themeStore';

const ChatbotLauncher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme(state => state.theme);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  const closeChatbot = () => {
    setIsOpen(false);
  };

  return (
    <div>
      {isOpen && <ChatbotComponent onClose={closeChatbot} />}
      {!isOpen && (
        <button
          className={`chatbot-launcher ${theme === 'dark' ? 'dark' : 'light'}`}
          onClick={toggleChatbot}
        >
          <ChatIcon fontSize="large" />
        </button>
      )}
    </div>
  );
};

export default ChatbotLauncher;
