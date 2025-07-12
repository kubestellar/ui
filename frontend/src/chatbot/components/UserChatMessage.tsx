import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// You can import the ChatMessageProps interface from BotChatMessage.tsx
// or a shared types file to keep your code DRY (Don't Repeat Yourself).
import type { ChatMessageProps } from './BotChatMessage';

const UserChatMessage: React.FC<ChatMessageProps> = ({ message, payload }) => {
  const timestamp = payload?.timestamp
    ? new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="user-chat-message-bubble">
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
      </div>
      {timestamp && <div className="chat-message-timestamp">{timestamp}</div>}
    </div>
  );
};

export default UserChatMessage;
