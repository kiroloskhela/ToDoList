import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import { TaskBoardPage } from './components/TaskBoardPage';
import { BoardErrorBoundary } from './components/BoardErrorBoundary';
import './styles/board.css';
const client = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={client}><BoardErrorBoundary><TaskBoardPage/></BoardErrorBoundary></QueryClientProvider></React.StrictMode>,
);
