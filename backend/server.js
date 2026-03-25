const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
const PORT = 3001;

// --- MIDDLEWARE ---
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Debug Logger: This will print every request to your terminal
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', apiLimiter);

// --- ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});


app.post('/api/explain', async (req, res) => {
    try {
        const { stepType, stepDescription, callStackDepth } = req.body;

        // Ensure headers are set for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a JavaScript teacher explaining execution to a beginner. 3 short sentences max. No jargon. Be warm.'
                },
                {
                    role: 'user',
                    content: `Step: ${stepType || 'Next step'}. Description: ${stepDescription || 'Moving forward'}. Depth: ${callStackDepth || 1}.`
                }
            ],
            model: 'llama-3.1-8b-instant',
            stream: true,
            max_tokens: 150,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                // The SDK handles the parsing - we just send the text
                res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error("Groq SDK Error:", error);
        
        // Handle the 400 error specifically
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'AI unavailable', 
                details: error.message 
            });
        } else {
            res.end();
        }
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`JSViz backend running on port ${PORT}`);
});