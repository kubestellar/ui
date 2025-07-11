import { api } from '../lib/api';
import BotChatMessage from './components/BotChatMessage';

class ActionProvider {
  createChatBotMessage: any;
  setState: any;
  createClientMessage: any;
  stateRef: any;
  addMessageToBotState: any;

  constructor(
    createChatBotMessage: any,
    setStateFunc: any,
    createClientMessage: any,
    stateRef: any,
    createCustomMessage: any
  ) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
    this.createClientMessage = createClientMessage;
    this.stateRef = stateRef;
    this.addMessageToBotState = createCustomMessage;
  }

  handleMessage = async (message: string) => {
    this.setTyping(true);
    try {
      const literalMessage = `User said: "${message}"`;
      const response = await api.get('/api/v1/chatbot', {
        params: { q: literalMessage },
      });
      const data = response.data;

      this.setTyping(false);
      if (data.answer) {
        const botMessage = this.createChatBotMessage(data.answer, {
          widget: 'sourcesWidget',
          payload: {
            sources: data.sources || [],
            timestamp: new Date().toISOString(),
          },
        });
        this.addMessageToState(botMessage);
      } else {
        const botMessage = this.createChatBotMessage("I'm sorry, I don't have an answer for that.");
        this.addMessageToState(botMessage);
      }
    } catch (error) {
      this.setTyping(false);
      console.error('Error fetching chatbot response:', error);
      const errorMessage = BotChatMessage.create(
        'Sorry, something went wrong. Please try again later.',
        'error'
      );
      this.addMessageToState(errorMessage);
    }
  };

  addMessageToState = (message: any) => {
    this.setState((prevState: any) => ({
      ...prevState,
      messages: [...prevState.messages, message],
    }));
  };

  setTyping = (isTyping: boolean) => {
    this.setState((prevState: any) => ({
      ...prevState,
      loading: isTyping,
    }));
  };
}

export default ActionProvider;
