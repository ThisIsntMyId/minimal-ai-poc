import express from 'express';
import OpenAI from 'openai';
import { config } from '../config.js';
import { retrieveAndAugment, isFitnessRelated, getRAGStatus } from '../services/rag-service.js';

const router = express.Router();

// Simple in-memory chat history
const chatHistory = [];

// Tool Functions - These will interact with your database
const toolFunctions = {
    async createAppointment(args, req) {
        try {
            const appointmentData = {
                patientName: args.patientName,
                doctorName: args.doctorName,
                date: args.date,
                time: args.time,
                type: args.type || 'consultation',
                notes: args.notes || '',
                status: 'scheduled'
            };
            
            const newAppointment = { ...appointmentData, id: Date.now() };
            req.db.data.appointments.push(newAppointment);
            await req.db.write();
            
            return {
                success: true,
                data: newAppointment,
                message: `Appointment created successfully for ${args.patientName} with ${args.doctorName} on ${args.date} at ${args.time}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to create appointment'
            };
        }
    },

    async createPrescription(args, req) {
        try {
            const prescriptionData = {
                patientName: args.patientName,
                doctorName: args.doctorName,
                medications: args.medications, // Array of medication objects
                dosage: args.dosage,
                duration: args.duration,
                instructions: args.instructions || '',
                date: args.date || new Date().toISOString().split('T')[0],
                status: 'active'
            };
            
            const newPrescription = { ...prescriptionData, id: Date.now() };
            req.db.data.prescriptions.push(newPrescription);
            await req.db.write();
            
            return {
                success: true,
                data: newPrescription,
                message: `Prescription created successfully for ${args.patientName}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to create prescription'
            };
        }
    },

    async createFitnessPlan(args, req) {
        try {
            const fitnessData = {
                patientName: args.patientName,
                planType: args.planType || 'general',
                duration: args.duration, // in weeks
                goals: args.goals || [],
                exercises: args.exercises || [],
                frequency: args.frequency || 'daily',
                difficulty: args.difficulty || 'moderate',
                instructions: args.instructions || '',
                createdDate: new Date().toISOString().split('T')[0],
                status: 'active'
            };
            
            const newFitnessPlan = { ...fitnessData, id: Date.now() };
            req.db.data.fitness_plans.push(newFitnessPlan);
            await req.db.write();
            
            return {
                success: true,
                data: newFitnessPlan,
                message: `Fitness plan created successfully for ${args.patientName}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to create fitness plan'
            };
        }
    },

    async createMealPlan(args, req) {
        try {
            const mealData = {
                patientName: args.patientName,
                planType: args.planType || 'balanced',
                duration: args.duration, // in days
                dietaryRestrictions: args.dietaryRestrictions || [],
                meals: args.meals || [],
                calories: args.calories || 2000,
                goals: args.goals || [],
                instructions: args.instructions || '',
                createdDate: new Date().toISOString().split('T')[0],
                status: 'active'
            };
            
            const newMealPlan = { ...mealData, id: Date.now() };
            req.db.data.meal_plans.push(newMealPlan);
            await req.db.write();
            
            return {
                success: true,
                data: newMealPlan,
                message: `Meal plan created successfully for ${args.patientName}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to create meal plan'
            };
        }
    }
};

// OpenAI Function Definitions
const tools = [
    {
        type: "function",
        function: {
            name: "createAppointment",
            description: "Create a new appointment for a patient",
            parameters: {
                type: "object",
                properties: {
                    patientName: {
                        type: "string",
                        description: "Name of the patient"
                    },
                    doctorName: {
                        type: "string",
                        description: "Name of the doctor"
                    },
                    date: {
                        type: "string",
                        description: "Date of appointment (YYYY-MM-DD format)"
                    },
                    time: {
                        type: "string",
                        description: "Time of appointment (HH:MM format)"
                    },
                    type: {
                        type: "string",
                        description: "Type of appointment (consultation, checkup, follow-up, etc.)"
                    },
                    notes: {
                        type: "string",
                        description: "Additional notes for the appointment"
                    }
                },
                required: ["patientName", "doctorName", "date", "time"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createPrescription",
            description: "Create a new prescription for a patient",
            parameters: {
                type: "object",
                properties: {
                    patientName: {
                        type: "string",
                        description: "Name of the patient"
                    },
                    doctorName: {
                        type: "string",
                        description: "Name of the prescribing doctor"
                    },
                    medications: {
                        type: "array",
                        description: "List of medications",
                        items: {
                            type: "string"
                        }
                    },
                    dosage: {
                        type: "string",
                        description: "Dosage instructions"
                    },
                    duration: {
                        type: "string",
                        description: "Duration of treatment"
                    },
                    instructions: {
                        type: "string",
                        description: "Additional instructions for the patient"
                    }
                },
                required: ["patientName", "doctorName", "medications", "dosage", "duration"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createFitnessPlan",
            description: "Create a new fitness plan for a patient",
            parameters: {
                type: "object",
                properties: {
                    patientName: {
                        type: "string",
                        description: "Name of the patient"
                    },
                    planType: {
                        type: "string",
                        description: "Type of fitness plan (weight-loss, muscle-building, cardio, etc.)"
                    },
                    duration: {
                        type: "number",
                        description: "Duration of the plan in weeks"
                    },
                    goals: {
                        type: "array",
                        description: "Fitness goals",
                        items: {
                            type: "string"
                        }
                    },
                    exercises: {
                        type: "array",
                        description: "List of exercises",
                        items: {
                            type: "string"
                        }
                    },
                    frequency: {
                        type: "string",
                        description: "Frequency of exercise (daily, 3x per week, etc.)"
                    },
                    difficulty: {
                        type: "string",
                        description: "Difficulty level (beginner, moderate, advanced)"
                    },
                    instructions: {
                        type: "string",
                        description: "Additional instructions"
                    }
                },
                required: ["patientName", "duration", "goals"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createMealPlan",
            description: "Create a new meal plan for a patient",
            parameters: {
                type: "object",
                properties: {
                    patientName: {
                        type: "string",
                        description: "Name of the patient"
                    },
                    planType: {
                        type: "string",
                        description: "Type of meal plan (weight-loss, diabetic, heart-healthy, etc.)"
                    },
                    duration: {
                        type: "number",
                        description: "Duration of the plan in days"
                    },
                    dietaryRestrictions: {
                        type: "array",
                        description: "Dietary restrictions or allergies",
                        items: {
                            type: "string"
                        }
                    },
                    meals: {
                        type: "array",
                        description: "List of meals",
                        items: {
                            type: "string"
                        }
                    },
                    calories: {
                        type: "number",
                        description: "Daily calorie target"
                    },
                    goals: {
                        type: "array",
                        description: "Nutritional goals",
                        items: {
                            type: "string"
                        }
                    },
                    instructions: {
                        type: "string",
                        description: "Additional instructions"
                    }
                },
                required: ["patientName", "duration", "goals"]
            }
        }
    }
];

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Exchange messages with the AI chat agent with RAG and tool support
 *     description: Sends a message to the chat agent and receives a response. Uses RAG for fitness-related queries and can execute tools like creating appointments, prescriptions, fitness plans, and meal plans.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The user's message.
 *     responses:
 *       200:
 *         description: The AI agent's response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   description: The AI's reply.
 *                 toolsExecuted:
 *                   type: array
 *                   description: List of tools that were executed.
 *                 ragUsed:
 *                   type: boolean
 *                   description: Whether RAG was used for this response.
 *                 citations:
 *                   type: array
 *                   description: Sources used from RAG.
 */
router.post('/', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = config.openaiApiKey;
    console.log("🚀 ~ router.post ~ apiKey:", apiKey ? "Present" : "Missing");

    if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key not configured on the server.' });
    }

    try {
        const openai = new OpenAI({
            apiKey: apiKey,
        });

        // Check if query is fitness-related and retrieve relevant context
        let ragContext = null;
        let citations = [];
        let ragUsed = false;

        if (isFitnessRelated(userMessage)) {
            console.log('🏃‍♂️ Fitness-related query detected, using RAG...');
            const ragResult = await retrieveAndAugment(userMessage);
            
            if (ragResult.context) {
                ragContext = ragResult.context;
                citations = ragResult.citations;
                ragUsed = true;
                console.log(`📚 RAG context retrieved: ${ragResult.chunks.length} chunks from ${citations.length} sources`);
            }
        }

        // Create system prompt with or without RAG context
        let systemPrompt = 'You are a helpful medical assistant. You can help create appointments, prescriptions, fitness plans, and meal plans for patients. Always ask for required information before creating any plans.';
        
        if (ragContext) {
            systemPrompt += `\n\nYou have access to fitness and health knowledge from documents. Use the following context to provide accurate, evidence-based answers:\n\n${ragContext}\n\nWhen providing fitness or health advice, cite the relevant document sources when appropriate.`;
        }

        // Convert chat history to OpenAI format
        const messages = [
            { 
                role: 'system', 
                content: systemPrompt
            },
            ...chatHistory.map(entry => [
                { role: 'user', content: entry.user },
                { role: 'assistant', content: entry.ai }
            ]).flat(),
            { role: 'user', content: userMessage }
        ];

        console.log("Messages being sent:", JSON.stringify(messages.slice(0, 2), null, 2)); // Log first 2 messages to avoid spam

        const completion = await openai.chat.completions.create({
            model: 'gpt-4', // Using GPT-4 for better tool usage and RAG understanding
            messages: messages,
            tools: tools,
            tool_choice: "auto", // Let the model decide when to use tools
            max_tokens: 800, // Increased for RAG responses
            temperature: 0.7,
        });

        const responseMessage = completion.choices[0].message;
        const toolsExecuted = [];

        // Check if the model wants to call any tools
        if (responseMessage.tool_calls) {
            console.log("Tools called:", responseMessage.tool_calls);

            // Execute each tool call
            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);

                console.log(`Executing tool: ${functionName} with args:`, functionArgs);

                if (toolFunctions[functionName]) {
                    const result = await toolFunctions[functionName](functionArgs, req);
                    toolsExecuted.push({
                        tool: functionName,
                        args: functionArgs,
                        result: result
                    });

                    // Add the tool result to the conversation
                    messages.push({
                        role: 'assistant',
                        content: responseMessage.content || '',
                        tool_calls: responseMessage.tool_calls
                    });
                    
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    });
                } else {
                    console.error(`Unknown tool function: ${functionName}`);
                }
            }

            // Get the final response after tool execution
            const finalCompletion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: messages,
                max_tokens: 400,
                temperature: 0.7,
            });

            const finalResponse = finalCompletion.choices[0].message.content;
            console.log("Final AI Response:", finalResponse);

            // Store in history
            chatHistory.push({ user: userMessage, ai: finalResponse });

            res.json({ 
                response: finalResponse,
                toolsExecuted: toolsExecuted,
                ragUsed: ragUsed,
                citations: citations
            });

        } else {
            // No tools called, regular response
            const aiResponse = responseMessage.content;
            console.log("AI Response:", aiResponse);

            // Store in history
            chatHistory.push({ user: userMessage, ai: aiResponse });

            res.json({ 
                response: aiResponse,
                toolsExecuted: [],
                ragUsed: ragUsed,
                citations: citations
            });
        }
        
    } catch (error) {
        console.error('OpenAI API Error:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        
        // More specific error handling
        if (error.status === 401) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        if (error.status === 429) {
            return res.status(429).json({ error: 'API quota exceeded or rate limit hit' });
        }
        if (error.status === 400) {
            return res.status(400).json({ error: 'Bad request - check your parameters' });
        }
        
        res.status(500).json({ 
            error: 'Failed to get response from AI', 
            details: error.message 
        });
    }
});

/**
 * @swagger
 * /api/chat/rag-status:
 *   get:
 *     summary: Get RAG service status
 *     description: Returns the current status of the RAG service and vector database.
 *     responses:
 *       200:
 *         description: RAG service status information.
 */
router.get('/rag-status', async (req, res) => {
    try {
        const status = await getRAGStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            reason: error.message 
        });
    }
});

export default router;