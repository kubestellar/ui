import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IChatMessage } from '../ChatbotComponent';

interface UserChatMessageProps {
  message: IChatMessage;
}

const UserChatMessage: React.FC<UserChatMessageProps> = ({ message }) => {
  const timestamp = message.payload?.timestamp
    ? new Date(message.payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="user-chat-message-bubble">
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.message}</ReactMarkdown>
      </div>
      {timestamp && <div className="chat-message-timestamp">{timestamp}</div>}
    </div>
  );
};

export default UserChatMessage;
