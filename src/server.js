// Load environment variables first
require('dotenv').config();

// Import our dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');
const { classifyDocument } = require('./classifier');

// Add In-memory analytics storage (in production, you'd use a database)
let analyticsData = {
    totalClassifications: 0,
    classifications: [],
    dailyStats: {},
    errorCount: 0,
    responseTimeSum: 0
};

// Create our Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());                    // Allow cross-origin requests
app.use(express.json());            // Parse JSON request bodies
app.use(express.static('public'));  // Serve static files
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );
    next();
});

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

// Update your /api/classify endpoint to track metrics
app.post('/api/classify', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { text } = req.body;
        
        // Your existing validation code stays the same...
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({
                error: 'Please provide valid document text'
            });
        }

        if (text.length > 10000) {
            return res.status(400).json({
                error: 'Document too long. Please limit to 10,000 characters.'
            });
        }

        // Classify the document
        const result = await classifyDocument(text.trim());
        
        // NEW: Track analytics
        const responseTime = Date.now() - startTime;
        const today = new Date().toISOString().split('T')[0];
        
        analyticsData.totalClassifications++;
        analyticsData.responseTimeSum += responseTime;
        analyticsData.classifications.push({
            timestamp: new Date(),
            category: result.category,
            confidence: result.confidence,
            responseTime: responseTime,
            textLength: text.length
        });
        
        // Daily stats
        if (!analyticsData.dailyStats[today]) {
            analyticsData.dailyStats[today] = { count: 0, categories: {} };
        }
        analyticsData.dailyStats[today].count++;
        analyticsData.dailyStats[today].categories[result.category] = 
            (analyticsData.dailyStats[today].categories[result.category] || 0) + 1;
        
        res.json(result);
        
    } catch (error) {
        analyticsData.errorCount++;
        console.error('Classification error:', error);
        res.status(500).json({
            error: 'Classification service temporarily unavailable'
        });
    }
});

// New analytics endpoint
app.get('/api/analytics', (req, res) => {
    const avgResponseTime = analyticsData.totalClassifications > 0 
        ? analyticsData.responseTimeSum / analyticsData.totalClassifications 
        : 0;
    
    // Calculate confidence distribution
    const confidenceRanges = { high: 0, medium: 0, low: 0 };
    analyticsData.classifications.forEach(c => {
        if (c.confidence >= 80) confidenceRanges.high++;
        else if (c.confidence >= 60) confidenceRanges.medium++;
        else confidenceRanges.low++;
    });
    
    // Category breakdown
    const categoryStats = {};
    analyticsData.classifications.forEach(c => {
        categoryStats[c.category] = (categoryStats[c.category] || 0) + 1;
    });
    
    res.json({
        totalClassifications: analyticsData.totalClassifications,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: analyticsData.totalClassifications > 0 
            ? (analyticsData.errorCount / (analyticsData.totalClassifications + analyticsData.errorCount) * 100).toFixed(1)
            : 0,
        confidenceDistribution: confidenceRanges,
        categoryBreakdown: categoryStats,
        dailyStats: analyticsData.dailyStats,
        recentClassifications: analyticsData.classifications.slice(-10).reverse()
    });
});
