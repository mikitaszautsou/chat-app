# AI Chat App

A multi-provider AI chat application built with React, Material UI, and Vite. Supports Anthropic Claude, Google Gemini, and DeepSeek models with advanced conversation management features.

## Features

### Multi-Provider Support
- **Anthropic Claude** - Claude Sonnet 4.5, Claude Opus 4, Claude 3.5 Sonnet
- **Google Gemini** - Gemini 3 Pro, Gemini 2.0 Flash with thinking support
- **DeepSeek** - DeepSeek Chat (V3.2), DeepSeek Reasoner with extended thinking

### Advanced Chat Features
- **Streaming responses** with thinking blocks visualization
- **Conversation branching** - Create and switch between different conversation paths
- **Message editing** - Edit your messages and automatically regenerate AI responses
- **Message deletion** - Remove messages and their entire subtree
- **Message collapse/expand** - Manage long conversations with collapsible messages
- **Model switching** - Change AI models mid-conversation
- **Provider selection** - Choose provider and model when creating new chats

### Storage & Persistence
- File-based chat storage for reliability
- Auto-save on every change
- Conversation history with branching support
- Emoji and title auto-generation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API keys:
   - Copy `.env.example` to `.env`
   - Add your API key(s) to `.env`:
```
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
VITE_GEMINI_API_KEY=your_gemini_key_here
VITE_DEEPSEEK_API_KEY=your_deepseek_key_here
```
   - You only need to configure keys for the providers you want to use

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

Chat data is stored in the `chats/` directory as JSON files. Each chat includes:
- Unique ID
- Title and emoji
- Provider and model
- Message history with branching structure
- Timestamps
- Conversation tree (messagesMap, rootMessageIds, currentBranchPath)

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**.

### What this means:
- ✅ **You can** use, modify, and share this software for personal and educational purposes
- ✅ **You can** create derivative works based on this code
- ❌ **You cannot** use this software for commercial purposes
- 📝 **You must** give appropriate credit and share modifications under the same license

For the full license text, see the [LICENSE](LICENSE) file or visit https://creativecommons.org/licenses/by-nc-sa/4.0/

For commercial licensing inquiries, please contact the project maintainers.
