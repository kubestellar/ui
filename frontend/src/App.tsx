import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routesConfig } from './routes/routes-config';
import ChatbotLauncher from './components/chatbot/ChatbotLauncher';

const router = createBrowserRouter(routesConfig);

const App: React.FC = () => {
  return (
    <>
      <RouterProvider router={router} />
      <ChatbotLauncher />
    </>
  );
};

export default App;
