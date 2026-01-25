# AI Chat App

A simple multi-provider AI chat application built with React, Material UI, and Vite.

## Features

- Chat with multiple AI providers (currently supports Anthropic)
- Streaming responses with thinking blocks
- Local storage persistence
- Clean Material UI interface
- Extensible provider system

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API keys:
   - Copy `.env.example` to `.env` (already created)
   - Add your API key(s) to `.env`:
```
VITE_ANTHROPIC_API_KEY=your_actual_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── ChatsScreen.jsx    # List of all chats
│   └── ChatScreen.jsx     # Individual chat view
├── providers/
│   ├── BaseProvider.js    # Abstract provider interface
│   ├── AnthropicProvider.js # Anthropic implementation
│   └── index.js           # Provider factory
├── App.jsx                # Main app with navigation
└── main.jsx              # Entry point
```

## Adding New Providers

To add a new AI provider:

1. Create a new provider class extending `BaseProvider` in `src/providers/`
2. Implement required methods:
   - `getName()` - Return provider name
   - `getModels()` - Return available models
   - `sendMessage(messages, onChunk, options)` - Handle streaming messages
3. Register the provider in `src/providers/index.js`

Example:
```javascript
import BaseProvider from './BaseProvider'

class MyProvider extends BaseProvider {
  getName() {
    return 'MyProvider'
  }

  getModels() {
    return [{ id: 'model-1', name: 'Model 1' }]
  }

  async sendMessage(messages, onChunk, options) {
    // Implementation
  }
}
```

## Security Note

The current implementation uses `dangerouslyAllowBrowser: true` for the Anthropic SDK, which is suitable for development only. For production, you should:

1. Create a backend API proxy
2. Store API keys on the server
3. Make requests through your backend

## Storage

Chat data is stored in browser's localStorage under the key `ai-chat-app-chats`. Each chat includes:
- Unique ID
- Title
- Provider and model
- Message history
- Timestamps
