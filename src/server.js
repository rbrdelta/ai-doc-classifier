// Load environment variables first
require('dotenv').config();

// Import our dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');
const { classifyDocument } = require('./classifier');

// Create our Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());                    // Allow cross-origin requests
app.use(express.json());            // Parse JSON request bodies
app.use(express.static('public'));  // Serve static files

// Basic route to test server is working
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {

    res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Classification endpoint
app.post('/api/classify', async (req, res) => {
    try {
        const { text } = req.body;

        // Validate input
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Please provide valid document text' 
            });
        }

        // Check text length (Claude has token limits)
        if (text.length > 10000) {
            return res.status(400).json({ 
                error: 'Document too long. Please limit to 10,000 characters.' 
            });
        }

        // Classify the document
        const result = await classifyDocument(text.trim());
        
        res.json(result);

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: 'Classification service temporarily unavailable' 
        });
    }
});