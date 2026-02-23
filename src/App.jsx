import { useState, useMemo, useEffect } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import ChatsScreen from './components/ChatsScreen'
import ChatScreen from './components/ChatScreen'
import { chatsAPI } from './api/chats'

// Provider-based color mapping
const getProviderColor = (provider) => {
  const providerLower = provider?.toLowerCase() || 'anthropic'
  switch (providerLower) {
    case 'anthropic':
      return '#ff9800' // Orange
    case 'gemini':
      return '#4caf50' // Green
    case 'deepseek':
      return '#2196f3' // Blue
    default:
      return '#1976d2' // Default blue
  }
}

function App() {
  const [currentScreen, setCurrentScreen] = useState('chats')
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [currentProvider, setCurrentProvider] = useState('anthropic')
  const [isTemporaryChat, setIsTemporaryChat] = useState(false)
  const [themeMode, setThemeMode] = useState(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('app-theme-mode')
    return savedTheme || 'light'
  })

  // Load chat ID from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const chatIdFromUrl = urlParams.get('chat')
    if (chatIdFromUrl) {
      setSelectedChatId(parseInt(chatIdFromUrl))
      setCurrentScreen('chat')
    }
  }, [])

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('app-theme-mode', themeMode)
  }, [themeMode])

  // Update URL when chat is selected
  useEffect(() => {
    if (currentScreen === 'chat' && selectedChatId) {
      const url = new URL(window.location)
      url.searchParams.set('chat', selectedChatId.toString())
      window.history.pushState({}, '', url)
    } else if (currentScreen === 'chats') {
      const url = new URL(window.location)
      url.searchParams.delete('chat')
      window.history.pushState({}, '', url)
    }
  }, [currentScreen, selectedChatId])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: {
            main: getProviderColor(currentProvider),
          },
          secondary: {
            main: themeMode === 'light' ? '#dc004e' : '#f48fb1',
          },
        },
      }),
    [themeMode, currentProvider]
  )

  const toggleTheme = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const handleOpenChat = (chatId, isTemporary) => {
    setSelectedChatId(chatId)
    setIsTemporaryChat(!!isTemporary)
    setCurrentScreen('chat')
  }

  const handleBackToChats = async () => {
    if (isTemporaryChat && selectedChatId) {
      try {
        await chatsAPI.delete(selectedChatId)
      } catch (error) {
        console.error('Error deleting temporary chat:', error)
      }
    }
    setCurrentScreen('chats')
    setSelectedChatId(null)
    setIsTemporaryChat(false)
    setCurrentProvider('anthropic') // Reset to default when back to chats
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {currentScreen === 'chats' && (
        <ChatsScreen
          onChatClick={handleOpenChat}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
        />
      )}
      {currentScreen === 'chat' && selectedChatId && (
        <ChatScreen
          chatId={selectedChatId}
          onBack={handleBackToChats}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
          onProviderChange={setCurrentProvider}
        />
      )}
    </ThemeProvider>
  )
}

export default App
