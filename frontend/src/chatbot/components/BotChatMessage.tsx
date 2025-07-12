import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define a reusable interface for chat message component props.
// It's a good idea to move this to a shared types file (e.g., src/chatbot/types.ts)
// to avoid duplication.
export interface ChatMessageProps {
  message: string;
  payload?: {
    timestamp?: string;
    // Add other payload properties if they exist
  };
  children?: React.ReactNode; // Type for props.children
}

const BotChatMessage: React.FC<ChatMessageProps> = ({ message, payload, children }) => {
  const timestamp = payload?.timestamp
    ? new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="bot-chat-message-bubble">
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
      </div>
      {children}
      {timestamp && <div className="chat-message-timestamp">{timestamp}</div>}
    </div>
  );
};

export default BotChatMessage;