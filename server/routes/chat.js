import express from 'express';
import OpenAI from 'openai';
import { config } from '../config.js';

const router = express.Router();

// Simple in-memory chat history
const chatHistory = [];

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Exchange messages with the AI chat agent
 *     description: Sends a message to the chat agent and receives a response.
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

        // Convert chat history to OpenAI format
        const messages = [
            { role: 'system', content: 'You are a helpful assistant.' },
            ...chatHistory.map(entry => [
                { role: 'user', content: entry.user },
                { role: 'assistant', content: entry.ai }
            ]).flat(),
            { role: 'user', content: userMessage }
        ];

        console.log("Messages being sent:", JSON.stringify(messages, null, 2));

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // or 'gpt-4', 'gpt-4-turbo', etc.
            messages: messages,
            max_tokens: 150,
            temperature: 0.7,
        });

        const aiResponse = completion.choices[0].message.content;

        console.log("AI Response:", aiResponse);

        // Store in history
        chatHistory.push({ user: userMessage, ai: aiResponse });

        res.json({ response: aiResponse });
        
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

export default router;