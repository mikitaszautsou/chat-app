import { ThemeProvider, createTheme } from '@mui/material/styles'
import ChatsScreen from './components/ChatsScreen'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <ChatsScreen />
    </ThemeProvider>
  )
}

export default App
