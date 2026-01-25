import { useState } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import ChatsScreen from './components/ChatsScreen'
import ChatScreen from './components/ChatScreen'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
})

function App() {
  const [currentScreen, setCurrentScreen] = useState('chats')
  const [selectedChatId, setSelectedChatId] = useState(null)

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
      {currentScreen === 'chats' && (
        <ChatsScreen onChatClick={handleOpenChat} />
      )}
      {currentScreen === 'chat' && selectedChatId && (
        <ChatScreen chatId={selectedChatId} onBack={handleBackToChats} />
      )}
    </ThemeProvider>
  )
}

export default App
