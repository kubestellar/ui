import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import config from './config';
import MessageParser from './MessageParser';
import ActionProvider from './ActionProvider';
import { Close as CloseIcon } from '@mui/icons-material';
import './Chatbot.css';
import useTheme from '../../stores/themeStore';
import { useEffect } from 'react';

interface ChatbotComponentProps {
  onClose: () => void;
}

const ChatbotComponent = ({ onClose }: ChatbotComponentProps) => {
  const theme = useTheme(state => state.theme);

  useEffect(() => {
    // Apply theme classes to chatbot elements
    const applyThemeToElements = () => {
      const elements = [
        '.react-chatbot-kit-chat-container',
        '.react-chatbot-kit-chat-header',
        '.react-chatbot-kit-chat-input-form',
        '.react-chatbot-kit-chat-input',
        '.react-chatbot-kit-chat-btn-send',
        '.react-chatbot-kit-chat-message-container',
        '.react-chatbot-kit-bot-message',
        '.react-chatbot-kit-user-message',
      ];

      elements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.classList.remove('light', 'dark');
          element.classList.add(theme);
        }
      });
    };

    applyThemeToElements();

    const timer = setTimeout(applyThemeToElements, 100);

    return () => clearTimeout(timer);
  }, [theme]);

  return (
    <div className={`chatbot-container ${theme === 'dark' ? 'dark' : 'light'}`}>
      <div className="chatbot-header">
        <button
          className={`chatbot-close-button ${theme === 'dark' ? 'dark' : 'light'}`}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
      <Chatbot config={config} messageParser={MessageParser} actionProvider={ActionProvider} />
    </div>
  );
};

export default ChatbotComponent;
