const Anthropic = require('@anthropic-ai/sdk/index.js');

// Initialize Claude client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Our classification categories
const CATEGORIES = [
    'Billing & Payments',
    'Technical Support',
    'Account Management', 
    'Product Features/Bugs',
    'Refunds & Returns',
    'General Inquiry'
];

async function classifyDocument(text) {
    try {
        const prompt = `You are a customer support document classifier. Analyze the following customer message and classify it into one of these categories:

${CATEGORIES.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

Customer message:
"${text}"

Respond with a JSON object containing:
- category: the primary category name (exact match from the list above)
- confidence: a number between 0 and 1 indicating your confidence
- reasoning: a brief explanation of why you chose this category
- alternatives: an array of up to 2 alternative categories with their confidence scores

Example response format:
{
  "category": "Technical Support",
  "confidence": 0.92,
  "reasoning": "Customer is reporting a specific technical issue with file uploads",
  "alternatives": [
    {"category": "Product Features/Bugs", "confidence": 0.15},
    {"category": "General Inquiry", "confidence": 0.08}
  ]
}`;

        const message = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 500,
            messages: [{
                role: "user",
                content: prompt
            }]
        });

        // Parse Claude's response
        const responseText = message.content[0].text;
        const result = JSON.parse(responseText);

        // Validate the response
        if (!CATEGORIES.includes(result.category)) {
            throw new Error('Invalid category returned by Claude');
        }

        return result;

    } catch (error) {
        console.error('Classification error:', error);
        throw new Error('Failed to classify document');
    }
}

module.exports = { classifyDocument, CATEGORIES };