import { useState, useMemo, useEffect } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import ChatsScreen from './components/ChatsScreen'
import ChatScreen from './components/ChatScreen'

function App() {
  const [currentScreen, setCurrentScreen] = useState('chats')
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [themeMode, setThemeMode] = useState(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('app-theme-mode')
    return savedTheme || 'light'
  })

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('app-theme-mode', themeMode)
  }, [themeMode])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: {
            main: themeMode === 'light' ? '#1976d2' : '#90caf9',
          },
          secondary: {
            main: themeMode === 'light' ? '#dc004e' : '#f48fb1',
          },
        },
      }),
    [themeMode]
  )

  const toggleTheme = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const handleOpenChat = (chatId) => {
    setSelectedChatId(chatId)
    setCurrentScreen('chat')
  }

  const handleBackToChats = () => {
    setCurrentScreen('chats')
    setSelectedChatId(null)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {currentScreen === 'chats' && (
        <ChatsScreen onChatClick={handleOpenChat} themeMode={themeMode} onToggleTheme={toggleTheme} />
      )}
      {currentScreen === 'chat' && selectedChatId && (
        <ChatScreen chatId={selectedChatId} onBack={handleBackToChats} themeMode={themeMode} onToggleTheme={toggleTheme} />
      )}
    </ThemeProvider>
  )
}

export default App
