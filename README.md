# Fitness AI Agent - Personalized Fitness Assistant

A comprehensive fitness application with AI-powered personalization, featuring login flow, onboarding questionnaire, and contextual fitness guidance.

## 🚀 Features Implemented

### Phase 1: Login Flow & User Management ✅
- **Login Screen**: Collects user name and email
- **Local Storage**: Persists user details across sessions
- **Authentication State**: Manages login/logout functionality
- **User Header**: Displays user name when logged in

### Phase 2: Onboarding Flow ✅
- **6-Step Questionnaire**: Comprehensive fitness assessment
- **Progress Tracking**: Visual progress bar and step navigation
- **Data Validation**: Ensures all required fields are completed
- **Local Storage**: Saves onboarding responses

### Phase 3: Fitness Plan Generation ✅
- **Personalized Plans**: AI-generated based on user responses
- **Goal-Based Workouts**: Tailored to fitness objectives
- **Health Considerations**: Adapts to user limitations
- **Experience Levels**: Beginner, intermediate, advanced plans

### Phase 4: Time-Based Context ✅
- **Dynamic Greetings**: Morning, afternoon, evening messages
- **Contextual Questions**: Time-appropriate fitness guidance
- **Enhanced Chat**: AI responses with user context

## 📋 Onboarding Questions

1. **Fitness Goal**: Weight loss, muscle gain, endurance, flexibility, general fitness
2. **Plan Duration**: 1 week, 2 weeks, 1 month, 3 months
3. **Preferred Activities**: Strength training, cardio, yoga, bodyweight, sports
4. **Activities to Avoid**: High impact, heavy lifting, complex movements, long duration
5. **Health Conditions**: Back pain, knee problems, heart condition, other
6. **Experience Level**: Beginner (0-6 months), intermediate (6 months-2 years), advanced (2+ years)

## 🏗️ Technical Architecture

### Frontend
- **HTML5/CSS3**: Modern responsive design with Tailwind CSS
- **Vanilla JavaScript**: No framework dependencies
- **Local Storage**: Client-side data persistence
- **Progressive Enhancement**: Works without JavaScript

### Backend
- **Node.js/Express**: RESTful API server
- **LowDB**: Lightweight JSON database
- **OpenAI Integration**: GPT-4 for AI responses
- **RAG Service**: Knowledge base integration

### Data Flow
```
User Login → Onboarding → Plan Generation → Chat with Context
     ↓           ↓              ↓              ↓
Local Storage → Local Storage → Local Storage → Enhanced AI Responses
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-fitness-agent
   ```

2. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the `server` directory:
   ```env
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Access the application**
   Open `http://localhost:3000` in your browser

## 📁 Project Structure

```
ai-fitness-agent/
├── public/                 # Frontend files
│   ├── index.html         # Main application
│   └── js/
│       └── app.js         # Frontend logic
├── server/                # Backend files
│   ├── index.js           # Server entry point
│   ├── config.js          # Configuration
│   ├── routes/            # API routes
│   │   ├── chat.js        # Chat functionality
│   │   ├── fitness_plans.js # Fitness plan management
│   │   └── ...            # Other routes
│   └── services/          # Business logic
│       └── rag-service.js # RAG implementation
├── knowledge-base/        # Fitness documents
└── README.md             # This file
```

## 🔧 API Endpoints

### Authentication & User Management
- `POST /api/chat` - Enhanced chat with user context
- `POST /api/fitness_plans/generate` - Generate personalized fitness plan

### Data Management
- `GET /api/fitness_plans` - List fitness plans
- `POST /api/fitness_plans` - Create fitness plan
- `DELETE /api/fitness_plans/:id` - Delete fitness plan

## 💾 Data Storage

### Local Storage Keys
- `fitness_ai_user_details` - User name and email
- `fitness_ai_onboarding_responses` - Questionnaire answers
- `fitness_ai_fitness_plan` - Generated fitness plan

### Database Schema
```json
{
  "fitness_plans": [
    {
      "id": "timestamp",
      "plan_name": "string",
      "goal": "string",
      "duration": "string",
      "experience_level": "string",
      "health_considerations": "string",
      "created_for": "string",
      "created_at": "ISO date",
      "workouts": [...],
      "recommendations": [...]
    }
  ]
}
```

## 🎯 Usage Flow

1. **First Visit**: User sees login screen
2. **Login**: Enter name and email
3. **Onboarding**: Complete 6-step questionnaire
4. **Plan Generation**: AI creates personalized fitness plan
5. **Chat Interface**: Contextual fitness guidance
6. **Return Visits**: Direct access to chat with persistent data

## 🔮 Future Enhancements

### Phase 5: Advanced Features
- **Progress Tracking**: Workout completion and metrics
- **Social Features**: Share plans and achievements
- **Integration**: Wearable device connectivity
- **Nutrition**: Meal planning and tracking

### Phase 6: AI Enhancements
- **Voice Interface**: Speech-to-text and text-to-speech
- **Image Recognition**: Form analysis and feedback
- **Predictive Analytics**: Injury prevention and optimization
- **Personalization**: Learning from user behavior

## 🛠️ Development

### Adding New Features
1. Update frontend logic in `public/js/app.js`
2. Add backend routes in `server/routes/`
3. Update database schema if needed
4. Test with the provided test interface

### Testing
- Open `test.html` for implementation verification
- Use browser dev tools to inspect localStorage
- Test all user flows: login → onboarding → chat

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: This implementation provides a complete foundation for a personalized fitness AI assistant. The modular architecture allows for easy extension and customization based on specific requirements. 