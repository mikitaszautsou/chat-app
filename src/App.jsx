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
  const [primaryColor, setPrimaryColor] = useState(() => {
    // Load color preference from localStorage
    const savedColor = localStorage.getItem('app-primary-color')
    return savedColor || '#1976d2'
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

  useEffect(() => {
    // Save color preference to localStorage
    localStorage.setItem('app-primary-color', primaryColor)
  }, [primaryColor])

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
            main: primaryColor,
          },
          secondary: {
            main: themeMode === 'light' ? '#dc004e' : '#f48fb1',
          },
        },
      }),
    [themeMode, primaryColor]
  )

  const toggleTheme = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const handleColorChange = (color) => {
    setPrimaryColor(color)
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
        <ChatsScreen
          onChatClick={handleOpenChat}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
          primaryColor={primaryColor}
          onColorChange={handleColorChange}
        />
      )}
      {currentScreen === 'chat' && selectedChatId && (
        <ChatScreen
          chatId={selectedChatId}
          onBack={handleBackToChats}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
          primaryColor={primaryColor}
          onColorChange={handleColorChange}
        />
      )}
    </ThemeProvider>
  )
}

export default App
