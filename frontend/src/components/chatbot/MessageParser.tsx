class MessageParser {
  actionProvider: any;
  state: any;
  constructor(actionProvider: any, state: any) {
    this.actionProvider = actionProvider;
    this.state = state;
  }

  parse(message: string) {
    console.log(message);
    this.actionProvider.handleMessage(message);
  }
}

export default MessageParser;
