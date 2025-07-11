import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const UserChatMessage = (props: any) => {
  const { message, payload } = props;
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
