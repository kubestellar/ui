import React, { useState, useRef, useEffect } from 'react';
import { createClientMessage } from 'react-chatbot-kit';

const CustomChatInput = (props: any) => {
  const { actionProvider, botTyping, setState } = props;
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    if (inputValue.trim() !== '') {
      const message = createClientMessage(inputValue, {
        payload: { timestamp: new Date().toISOString() },
      });
      setState((prev: any) => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
      actionProvider.handleMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  return (
    <div className="custom-chat-input-container">
      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a command or ask a question..."
        className="custom-chat-input"
        rows={1}
        disabled={botTyping}
      />
      <button onClick={handleSubmit} className="custom-chat-input-button" disabled={botTyping}>
        {botTyping ? (
          <div className="loading-spinner"></div>
        ) : (
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
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        )}
      </button>
    </div>
  );
};

export default CustomChatInput;
