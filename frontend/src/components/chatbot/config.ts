import { createChatBotMessage } from 'react-chatbot-kit';

const config = {
  initialMessages: [
    createChatBotMessage(`Hello! I'm your friendly chatbot. How can I help you today?`, {}),
  ],
  botName: 'Chatbot',
  customStyles: {
    botMessageBox: {
      backgroundColor: '#37B789',
    },
    chatButton: {
      backgroundColor: '#5ccc9d',
    },
  },
};

export default config;
