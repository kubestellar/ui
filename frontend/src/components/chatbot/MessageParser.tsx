import ActionProvider from './ActionProvider';

// It's good practice to define shared types in a central file (e.g., src/types.ts)
// and import them. For now, we'll redefine the state interface here.
interface IChatMessage {
  message: string;
}

interface IChatbotState {
  messages: IChatMessage[];
  // Add any other properties from your chatbot's state here
}

class MessageParser {
  actionProvider: ActionProvider;
  state: IChatbotState;

  constructor(actionProvider: ActionProvider, state: IChatbotState) {
    this.actionProvider = actionProvider;
    this.state = state;
  }

  parse(message: string): void {
    // The 'parse' method is where you can add logic to interpret the user's message.
    // For now, it directly passes the message to the ActionProvider.
    console.log(message);
    this.actionProvider.handleMessage(message);
  }
}

export default MessageParser;