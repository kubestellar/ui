// frontend/src/chatbot/ChatbotComponent.tsx
import React, { useState, useRef, useEffect } from 'react';
import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import './ChatbotV2.css';

import ActionProvider from './ActionProvider';
import BotChatMessage from './components/BotChatMessage';
import UserChatMessage from './components/UserChatMessage';
import CustomHeader from './components/CustomHeader';
import CustomChatInput from './components/CustomChatInput';

const ChatbotComponent: React.FC = () => {
  const [showBot, toggleBot] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chatbotContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => setIsFullScreen(prev => !prev);

  const chatbotConfig = {
    initialMessages: [
      BotChatMessage.create(`Hello! I'm your KubeStellar assistant. How can I help you today?`),
    ],
    botName: 'KubeStellar Assistant',
    customComponents: {
      header: () => (
        <CustomHeader toggleFullScreen={toggleFullScreen} isFullScreen={isFullScreen} />
      ),
      botChatMessage: (props: any) => <BotChatMessage {...props} />,
      userChatMessage: (props: any) => <UserChatMessage {...props} />,
      chatInput: (props: any) => <CustomChatInput {...props} />,
      botTypingIndicator: () => (
        <div className="typing-indicator">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      ),
    },
  };

  const saveMessages = (messages: any) => {
    localStorage.setItem('chatbot_messages', JSON.stringify(messages));
  };

  const loadMessages = () => {
    const messages = localStorage.getItem('chatbot_messages');
    return messages ? JSON.parse(messages) : [];
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

BotChatMessage.create = (message: string, type: 'bot' | 'error' = 'bot') => ({
  message,
  type,
  id: Math.random(),
  payload: { timestamp: new Date().toISOString() },
});

export default ChatbotComponent;
