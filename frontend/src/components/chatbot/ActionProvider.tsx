import { api } from '../../lib/api';

// Define the shape of a single message object.
// The exact properties are determined by your chatbot library,
// but this provides a basic, type-safe structure.
interface IChatMessage {
  message: string;
  // Add other properties if your message objects have them (e.g., id, type, etc.)
}

// Define the shape of the chatbot's state.
interface IChatbotState {
  messages: IChatMessage[];
  // Add other state properties if they exist (e.g., loading: boolean)
}

// Define the expected shape of the API response data.
interface IApiResponse {
  answer: string;
}

class ActionProvider {
  createChatBotMessage: (message: string) => IChatMessage;
  setState: (updater: (prevState: IChatbotState) => IChatbotState) => void;

  constructor(
    createChatBotMessage: (message: string) => IChatMessage,
    setStateFunc: (updater: (prevState: IChatbotState) => IChatbotState) => void,
  ) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
  }

  handleMessage = async (message: string): Promise<void> => {
    try {
      // Use the generic version of api.get to type the response data
      const response = await api.get<IApiResponse>(`/api/v1/chatbot?q=${message}`);
      const botMessage = this.createChatBotMessage(response.data.answer);
      this.setState((prev: IChatbotState) => ({
        ...prev,
        messages: [...prev.messages, botMessage],
      }));
    } catch (error) {
      console.error('Error fetching chatbot response:', error);
      const botMessage = this.createChatBotMessage(
        "Sorry, I'm having trouble connecting to the server.",
      );
      this.setState((prev: IChatbotState) => ({
        ...prev,
        messages: [...prev.messages, botMessage],
      }));
    }
  };
}

export default ActionProvider;