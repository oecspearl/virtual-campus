# AI Tutor Setup Guide

## 🔧 **Environment Variables Setup**

To enable the AI tutor with real OpenAI responses, you need to set up the OpenAI API key.

### **Step 1: Get OpenAI API Key**

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (starts with `sk-`)

### **Step 2: Add Environment Variable**

#### **For Local Development:**
Add to your `.env.local` file:
```bash
OPENAI_API_KEY=sk-your-api-key-here
```

#### **For Heroku Production:**
1. Go to your Heroku dashboard
2. Select your app
3. Go to Settings → Config Vars
4. Add new config var:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: `sk-your-api-key-here`

### **Step 3: Deploy Changes**

After adding the environment variable, redeploy your application:

```bash
git add .
git commit -m "Add OpenAI integration for AI tutor"
git push heroku master
```

## 🧠 **How It Works**

### **With OpenAI API Key:**
- AI tutor uses GPT-4 for intelligent, context-aware responses
- Responses are tailored to the specific lesson content
- More natural and comprehensive explanations
- Better understanding of student questions

### **Without OpenAI API Key (Fallback):**
- AI tutor uses pre-built mock responses
- Still provides helpful, context-aware assistance
- Covers common question types (explain, examples, help, practice, summary)
- Good for testing and basic functionality

## 🔍 **Testing the AI Tutor**

1. **Enable AI Tutor**: Go to Profile → AI Tutor Preferences → Enable AI Tutor
2. **Enter a Lesson**: Navigate to any lesson
3. **Click AI Tutor Button**: Purple floating button on the left side
4. **Ask Questions**: Try asking:
   - "Explain the main concept"
   - "Give me an example"
   - "I need help with this lesson"
   - "Can you summarize this?"

## 📊 **Features**

### **Context-Aware Responses:**
- Understands lesson title, description, and concepts
- References learning objectives
- Considers student progress
- Adapts to course subject

### **Response Types:**
- **Explanations**: Break down complex concepts
- **Examples**: Provide real-world applications
- **Help**: Step-by-step guidance
- **Practice**: Suggest exercises and problems
- **Summaries**: Comprehensive lesson recaps
- **General**: Handle any other questions

### **Smart Features:**
- Learns from lesson content
- Provides relevant examples
- Asks follow-up questions
- Encourages active learning

## 🚨 **Troubleshooting**

### **If AI Tutor Shows Mock Responses:**
- Check that `OPENAI_API_KEY` is set correctly
- Verify the API key is valid and has credits
- Check Heroku logs for any API errors

### **If AI Tutor Doesn't Appear:**
- Ensure database tables are created (run `create-ai-tutor-schema.sql`)
- Check that AI Tutor is enabled in preferences
- Verify you're on a lesson page

### **If Getting 404 Errors:**
- Run the database setup scripts
- Check that all API endpoints are deployed
- Verify environment variables are set

## 💰 **Cost Considerations**

- OpenAI API charges per token used
- GPT-4 is more expensive than GPT-3.5
- Typical cost: $0.01-0.03 per conversation
- Consider setting usage limits in OpenAI dashboard

## 🔒 **Security Notes**

- API key is stored securely in environment variables
- Never commit API keys to version control
- Use different keys for development and production
- Monitor API usage in OpenAI dashboard
