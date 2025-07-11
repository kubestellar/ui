import { api } from '../../lib/api';

class ActionProvider {
  createChatBotMessage: any;
  setState: any;
  constructor(createChatBotMessage: any, setStateFunc: any) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
  }

  handleMessage = async (message: string) => {
    try {
      const response = await api.get(`/api/chatbot?q=${message}`);
      const botMessage = this.createChatBotMessage(response.data.answer);
      this.setState((prev: any) => ({
        ...prev,
        messages: [...prev.messages, botMessage],
      }));
    } catch (error) {
      console.error('Error fetching chatbot response:', error);
      const botMessage = this.createChatBotMessage(
        "Sorry, I'm having trouble connecting to the server."
      );
      this.setState((prev: any) => ({
        ...prev,
        messages: [...prev.messages, botMessage],
      }));
    }
  };
}

export default ActionProvider;
