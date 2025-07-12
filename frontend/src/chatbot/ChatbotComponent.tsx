// frontend/src/chatbot/ChatbotComponent.tsx
import React, { useState, useRef, useEffect } from 'react';
import Chatbot, { IConfig } from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import './ChatbotV2.css';

import ActionProvider from './ActionProvider';
import BotChatMessage from './components/BotChatMessage';
import UserChatMessage from './components/UserChatMessage';
import CustomHeader from './components/CustomHeader';
import CustomChatInput from './components/CustomChatInput';

// Define a type for our chat messages to avoid using 'any'
interface IChatMessage {
  message: string;
  type: string;
  id: number;
  loading?: boolean;
  widget?: string;
  payload?: {
    timestamp: string;
    sources?: string[];
  };
}

// Helper function to create a bot message, replacing the monkey-patch
const createBotMessage = (message: string, type: 'bot' | 'error' = 'bot'): IChatMessage => ({
  message,
  type,
  id: Math.random(), // In a real app, use a more robust ID generator
  payload: { timestamp: new Date().toISOString() },
});

// Define the type for props passed to custom message components
interface IMessageProps {
  message: IChatMessage;
  // Add other props if react-chatbot-kit passes them
}

// Define the type for props passed to the custom chat input
interface IChatInputProps {
  // This is a guess, adjust based on what CustomChatInput actually needs
  actionProvider: ActionProvider;
}

const ChatbotComponent: React.FC = () => {
  const [showBot, toggleBot] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chatbotContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => setIsFullScreen(prev => !prev);

  // Use the IConfig type from react-chatbot-kit for better type safety
  const chatbotConfig: IConfig = {
    initialMessages: [
      createBotMessage(`Hello! I'm your KubeStellar assistant. How can I help you today?`),
    ],
    botName: 'KubeStellar Assistant',
    customComponents: {
      header: () => (
        <CustomHeader toggleFullScreen={toggleFullScreen} isFullScreen={isFullScreen} />
      ),
      // Use the typed props interfaces here
      botChatMessage: (props: IMessageProps) => <BotChatMessage {...props} />,
      userChatMessage: (props: IMessageProps) => <UserChatMessage {...props} />,
      chatInput: (props: IChatInputProps) => <CustomChatInput {...props} />,
      botTypingIndicator: () => (
        <div className="typing-indicator">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      ),
    },
  };

  const saveMessages = (messages: IChatMessage[]): void => {
    localStorage.setItem('chatbot_messages', JSON.stringify(messages));
  };

  const loadMessages = (): IChatMessage[] => {
    const messagesJSON = localStorage.getItem('chatbot_messages');
    if (!messagesJSON) return [];

    try {
      const parsedMessages = JSON.parse(messagesJSON);
      // Basic validation to ensure we're returning an array
      return Array.isArray(parsedMessages) ? parsedMessages : [];
    } catch (e) {
      console.error('Failed to parse messages from localStorage', e);
      return [];
    }
  };

  useEffect(() => {
    if (showBot && chatbotContainerRef.current) {
      const messageContainer = chatbotContainerRef.current.querySelector(
        '.react-chatbot-kit-chat-message-container'
      );

      if (messageContainer) {
        const observer = new MutationObserver(() => {
          messageContainer.scrollTop = messageContainer.scrollHeight;
        });

        observer.observe(messageContainer, { childList: true });
        return () => observer.disconnect();
      }
    }
  }, [showBot]);

  const containerClasses = isFullScreen
    ? 'chatbot-main-container fullscreen'
    : 'chatbot-main-container';

  return (
    <div ref={chatbotContainerRef} className={containerClasses}>
      {showBot && (
        <Chatbot
          config={chatbotConfig}
          actionProvider={ActionProvider}
          messageHistory={loadMessages()}
          saveMessages={saveMessages}
        />
      )}
      <button
        onClick={() => toggleBot(prev => !prev)}
        className="chatbot-fab"
        aria-label={showBot ? 'Close Chat' : 'Open Chat'}
      >
        {showBot ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          '🤖'
        )}
      </button>
    </div>
  );
};

export default ChatbotComponent;
