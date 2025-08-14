import ReactMarkdown from 'react-markdown';

const MarkdownMessage = (props: any) => {
  return (
    <div className="react-chatbot-kit-chat-bot-message">
      <ReactMarkdown>{props.payload.message}</ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
