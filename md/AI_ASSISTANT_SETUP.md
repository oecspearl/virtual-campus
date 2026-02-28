# AI Assistant Setup Guide

This guide will help you set up the AI assistant feature in your OECS Learning Management System.

## Prerequisites

1. **OpenAI API Key**: You'll need an OpenAI API key to use the AI assistant features.
2. **Supabase Database**: The AI assistant requires additional database tables (see schema below).

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORGANIZATION=your_openai_organization_id_here

# AI Assistant Configuration (Optional - defaults provided)
AI_RATE_LIMIT_PER_USER=100
AI_CACHE_TTL=3600
AI_DAILY_LIMIT_API_CALLS=100
AI_DAILY_LIMIT_TOKENS=10000
AI_DAILY_LIMIT_COST_USD=5.00
```

## Database Setup

Run the following SQL script to create the necessary database tables:

```sql
-- Run the create-ai-assistant-schema.sql file in your Supabase SQL editor
```

This will create:
- `ai_conversations` - Stores user conversations with the AI
- `ai_messages` - Stores individual messages in conversations
- `ai_usage_tracking` - Tracks API usage and costs per user
- `ai_context_cache` - Caches user context to reduce API calls

## Features

### 1. AI Chat Widget
- **Floating Chat Button**: Always-available AI assistant in the bottom-right corner
- **Conversation Management**: Create, view, and delete conversations
- **Context Awareness**: AI understands user's current page and role
- **Usage Tracking**: Monitor API usage and costs

### 2. AI-Enhanced Help System
- **Smart Suggestions**: Context-aware help suggestions based on user role and current page
- **AI Search**: Natural language search through help content
- **Quick Actions**: Pre-defined common queries for quick access

### 3. API Endpoints
- `POST /api/ai/chat` - Send messages to AI assistant
- `GET /api/ai/chat` - Get user's conversations
- `GET /api/ai/conversations/[id]` - Get specific conversation
- `DELETE /api/ai/conversations/[id]` - Delete conversation
- `PUT /api/ai/conversations/[id]` - Update conversation title
- `GET /api/ai/usage` - Get usage statistics

## Usage

### For Users
1. **Access AI Assistant**: Click the floating robot icon in the bottom-right corner
2. **Ask Questions**: Type natural language questions about the platform
3. **View History**: Access previous conversations through the history button
4. **Get Suggestions**: Use the AI-powered help suggestions on the help page

### For Developers
1. **Context Management**: The AI context is automatically managed based on user's current page and role
2. **Custom Integration**: Use the `AIChatWidget` component in other pages
3. **API Integration**: Extend the AI functionality by adding new API endpoints

## Cost Management

The AI assistant includes built-in cost management features:

- **Rate Limiting**: Prevents excessive API usage
- **Usage Tracking**: Monitor tokens and costs per user
- **Daily Limits**: Configurable daily limits for API calls, tokens, and costs
- **Caching**: Reduces API calls by caching context data

## Security

- **Row Level Security**: All AI data is protected by RLS policies
- **User Isolation**: Users can only access their own conversations
- **Context Sanitization**: Sensitive data is removed before sending to OpenAI
- **API Authentication**: All AI endpoints require user authentication

## Troubleshooting

### Common Issues

1. **"AI service configuration error"**: Check your OpenAI API key
2. **"Failed to send message"**: Check your internet connection and API key
3. **"Conversation not found"**: The conversation may have been deleted or doesn't belong to the user

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## Customization

### Adding New Context
Extend the `AIContextManager` class to include additional context data:

```typescript
// In lib/ai-context.ts
const context: AIContext = {
  // ... existing context
  customData: {
    // Add your custom context here
  }
};
```

### Customizing AI Responses
Modify the system prompt in `lib/ai-context.ts` to customize how the AI responds:

```typescript
const buildSystemPrompt = (context: AIContext): string => {
  // Customize the system prompt here
};
```

### Adding New Quick Actions
Update the `quickActions` array in `AIChatWidget.tsx`:

```typescript
const quickActions = [
  "Your custom question here",
  // ... existing actions
];
```

## Monitoring

### Usage Analytics
- Monitor API usage through the `/api/ai/usage` endpoint
- Track costs and token usage per user
- Set up alerts for usage limits

### Performance
- Monitor response times for AI requests
- Track conversation engagement
- Monitor error rates

## Support

For issues or questions about the AI assistant:
1. Check the troubleshooting section above
2. Review the API documentation
3. Contact the development team

## Future Enhancements

Planned features for future releases:
- Multi-modal support (images, files)
- Voice input/output
- Advanced analytics dashboard
- Custom AI models
- Integration with other AI services
