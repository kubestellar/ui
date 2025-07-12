// frontend/src/chatbot/ChatbotComponent.tsx
import React, { useState, useRef, useEffect } from 'react';
import Chatbot, { createChatBotMessage } from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import './ChatbotV2.css';

import ActionProvider from './ActionProvider';
import BotChatMessage from './components/BotChatMessage';
import UserChatMessage from './components/UserChatMessage';
import CustomHeader from './components/CustomHeader';
import CustomChatInput from './components/CustomChatInput';

// Define the message interface
export interface IChatMessage {
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

interface IMessageProps {
  message: IChatMessage;
  [key: string]: unknown; // Using unknown is safer than any
}

const ChatbotComponent: React.FC = () => {
  const [showBot, toggleBot] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chatbotContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => setIsFullScreen(prev => !prev);

  // Chatbot configuration
  const config = {
    initialMessages: [
      createChatBotMessage(`Hello! I'm your KubeStellar assistant. How can I help you today?`, {
        delay: 1000,
        widget: 'response',
      }),
    ],
    botName: 'KubeStellar Assistant',
    customComponents: {
      header: () => (
        <CustomHeader toggleFullScreen={toggleFullScreen} isFullScreen={isFullScreen} />
      ),
      botChatMessage: (props: IMessageProps) => <BotChatMessage message={props.message} />,
      userChatMessage: (props: IMessageProps) => <UserChatMessage message={props.message} />,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chatInput: (props: any) => <CustomChatInput {...props} />,
      botTypingIndicator: () => (
        <div className="typing-indicator">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      ),
    },
    // @ts-ignore - The types for messageParser and actionProvider are not properly exported
    messageParser: {
      parse: (message: string) => ({
        message,
        type: 'user',
        id: Date.now(),
      }),
    },
    // @ts-ignore - Type for ActionProvider
    actionProvider: ActionProvider,
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
        <div className="chatbot-container">
          {/* @ts-ignore - The Chatbot component's props are not properly typed */}
          <Chatbot
            config={config}
            messageHistory={loadMessages()}
            saveMessages={saveMessages}
            messageParser={config.messageParser}
            actionProvider={config.actionProvider}
          />
        </div>
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
