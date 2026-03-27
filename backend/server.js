const express = require('express');
const cors = require('cors');

const app = express();

// CORS MUST be first - before anything else
app.use(cors());

const dotenv = require('dotenv');
dotenv.config();

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PORT = process.env.PORT || 3001;

// --- MIDDLEWARE ---
app.use(express.json());

// Debug Logger: This will print every request to your terminal
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} | Origin: ${req.headers.origin || 'none'}`);
    next();
});

// --- CUSTOM RATE LIMITER ---
// A simple sliding window rate limiter that won't conflict with Render's proxy
const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const maxRequestsPerWindow = 100;
const ipRequestCounts = new Map();

function customRateLimiter(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!ipRequestCounts.has(ip)) {
        ipRequestCounts.set(ip, []);
    }
    
    const requests = ipRequestCounts.get(ip);
    
    // Filter out requests older than the window
    const windowStart = now - rateLimitWindowMs;
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= maxRequestsPerWindow) {
        // Return a standard JSON response instead of abruptly dropping the connection
        return res.status(429).json({
            error: 'Too many requests',
            message: 'You have exceeded the 100 requests per 15 minutes limit. Please try again later.'
        });
    }
    
    recentRequests.push(now);
    ipRequestCounts.set(ip, recentRequests);
    
    // Optional: cleanup the map periodically to prevent memory leaks if many IPs connect
    if (ipRequestCounts.size > 1000) {
        for (const [key, reqs] of ipRequestCounts.entries()) {
            const validReqs = reqs.filter(time => time > windowStart);
            if (validReqs.length === 0) {
                ipRequestCounts.delete(key);
            } else {
                ipRequestCounts.set(key, validReqs);
            }
        }
    }
    
    next();
}

app.use('/api/', customRateLimiter);

// --- ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});


app.post('/api/explain', async (req, res) => {
    try {
        const { stepDescription, code: encodedCode, currentLine } = req.body;
        
        // Decode Base64 encoded code from frontend
        const code = encodedCode ? Buffer.from(encodedCode, 'base64').toString('utf-8') : '';

        // Ensure headers are set for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Disable Nginx/Proxy buffering
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders(); // Tell Express to send headers immediately

        let codeSnippet = '';
        if (code && currentLine) {
            const lines = code.split('\n');
            codeSnippet = lines[currentLine - 1] || '';
        }

        const stream = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are a JavaScript tutor for beginners.
Explain this execution step mechanically and straight to the point, using the shortest sentences possible.
Keep the language extremely simple but strictly use technical terms like "Call Stack", "Execution Context", "Web APIs", "Callback Queue", "Microtask Queue", or "Event Loop" when relevant.
Do NOT use filler words or conversational fluff to save tokens. Be extremely concise.

CRITICAL FORMATTING INSTRUCTION:
You MUST format your ONLY response directly in raw HTML. Do not wrap it in markdown blockticks.
Format it EXACTLY like this:
<h3>[Step Name]</h3>
<p>[Ultra-concise, simple 1-2 sentence explanation]</p>
<ul>
  <li>[Optional: bullet points for multiple fast actions]</li>
</ul>`
                },
                {
                    role: 'user',
                    content: `Here is the current step in the engine:
Engine Action: ${stepDescription || 'Moving forward'}
Code Line: "${codeSnippet.trim()}"
Explain exactly what is happening in simple terms right now.`
                }
            ],
            model: 'llama-3.1-8b-instant',
            stream: true,
            max_tokens: 250,
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
    
    // Self-ping to keep Render free tier warm (every 14 minutes)
    // Render spins down after 15 min of inactivity
    if (process.env.RENDER) {
        const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'https://jsviz.onrender.com';
        setInterval(() => {
            fetch(`${SELF_URL}/api/health`)
                .then(() => console.log('Keep-alive ping sent'))
                .catch(err => console.log('Keep-alive ping failed:', err.message));
        }, 14 * 60 * 1000); // 14 minutes
    }
});