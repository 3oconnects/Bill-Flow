import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import './styles/theme.css'
import './styles/landing.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min — serve cached data, no spinner on tab switch
      gcTime:    1000 * 60 * 15,  // 15 min — keep in memory across navigation
      retry: 1,
      refetchOnWindowFocus: false,
      // Keep showing the previous query's data while a new one loads, so pages
      // don't blank out / flicker into a full-page spinner on every navigation.
      placeholderData: keepPreviousData,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
