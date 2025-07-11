import { useState } from 'react';
import ChatbotComponent from './Chatbot';
import './ChatbotLauncher.css';
import { Chat as ChatIcon } from '@mui/icons-material';

const ChatbotLauncher = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      {isOpen && <ChatbotComponent />}
      <button className="chatbot-launcher" onClick={toggleChatbot}>
        <ChatIcon fontSize="large" />
      </button>
    </div>
  );
};

export default ChatbotLauncher;
