import ActionProvider from './ActionProvider';

// Define an interface for the chat messages. This should be consistent
// with the types used in other parts of your chatbot.
interface IChatMessage {
  message: string;
  type: string;
  id?: number;
}

// Define the shape of the chatbot's state
interface IChatbotState {
  messages: IChatMessage[];
  loading?: boolean;
  // Add other state properties if they exist
}

class MessageParser {
  actionProvider: ActionProvider;
  state: IChatbotState;

  constructor(actionProvider: ActionProvider, state: IChatbotState) {
    this.actionProvider = actionProvider;
    this.state = state;
  }

  parse(message: string): void {
    if (message) {
      this.actionProvider.handleMessage(message);
    }
  }
}

export default MessageParser;
