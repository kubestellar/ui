import { api } from '../lib/api';
import BotChatMessage from './components/BotChatMessage';

// Define interfaces for better type safety

// The structure of the payload attached to a bot message
interface IMessagePayload {
  sources: string[];
  timestamp: string;
}

// A generic message object. The exact properties are determined by the chatbot library,
// but we can define the ones we know from the code.
interface IChatMessage {
  message: string;
  type: string;
  id?: number;
  widget?: string;
  payload?: IMessagePayload;
  loading?: boolean;
}

// The shape of the chatbot's state
interface IChatbotState {
  messages: IChatMessage[];
  loading: boolean;
  // You can add other state properties here if they exist
}

// The expected structure of the data from the chatbot API endpoint
interface IApiResponse {
  answer: string;
  sources?: string[];
}

class ActionProvider {
  createChatBotMessage: (
    message: string,
    options?: { widget?: string; payload?: IMessagePayload }
  ) => IChatMessage;
  setState: (updater: (prevState: IChatbotState) => IChatbotState) => void;
  createClientMessage: (message: string) => IChatMessage;
  stateRef: { current: IChatbotState };
  addMessageToBotState: (message: IChatMessage) => void;

  constructor(
    createChatBotMessage: (
      message: string,
      options?: { widget?: string; payload?: IMessagePayload }
    ) => IChatMessage,
    setStateFunc: (updater: (prevState: IChatbotState) => IChatbotState) => void,
    createClientMessage: (message: string) => IChatMessage,
    stateRef: { current: IChatbotState },
    createCustomMessage: (message: IChatMessage) => void
  ) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
    this.createClientMessage = createClientMessage;
    this.stateRef = stateRef;
    this.addMessageToBotState = createCustomMessage;
  }

  handleMessage = async (message: string): Promise<void> => {
    this.setTyping(true);
    try {
      const literalMessage = `User said: "${message}"`;
      const response = await api.get('/api/v1/chatbot', {
        params: { q: literalMessage },
      });
      const data: IApiResponse = response.data;

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
      // Assuming BotChatMessage.create returns an object compatible with IChatMessage
      this.addMessageToState(errorMessage as IChatMessage);
    }
  };

  addMessageToState = (message: IChatMessage): void => {
    this.setState((prevState: IChatbotState) => ({
      ...prevState,
      messages: [...prevState.messages, message],
    }));
  };

  setTyping = (isTyping: boolean): void => {
    this.setState((prevState: IChatbotState) => ({
      ...prevState,
      loading: isTyping,
    }));
  };
}

export default ActionProvider;
