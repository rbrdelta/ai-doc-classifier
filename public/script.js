// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    const classifyBtn = document.getElementById('classifyBtn');
    const documentText = document.getElementById('documentText');
    const resultsDiv = document.getElementById('results');
    const resultContent = document.getElementById('resultContent');

    // Handle classify button click
    classifyBtn.addEventListener('click', async function() {
        const text = documentText.value.trim();
        
        // Basic validation
        if (!text) {
            alert('Please enter some document text to classify');
            return;
        }

        // Show loading state
        classifyBtn.textContent = 'Classifying...';
        classifyBtn.disabled = true;
        resultsDiv.style.display = 'none';

        try {
            // Call our API
            const response = await fetch('/api/classify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });

            const result = await response.json();

            if (response.ok) {
                // Display results
                displayResults(result);
            } else {
                throw new Error(result.error || 'Classification failed');
            }

        } catch (error) {
            console.error('Error:', error);
            resultContent.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            resultsDiv.style.display = 'block';
        } finally {
            // Reset button
            classifyBtn.textContent = 'Classify Document';
            classifyBtn.disabled = false;
        }
    });

    // Display classification results
    function displayResults(result) {
        const confidence = Math.round(result.confidence * 100);
        
        resultContent.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong>Primary Category:</strong> ${result.category}
                <span style="color: #666; margin-left: 10px;">(${confidence}% confidence)</span>
            </div>
            <div style="margin-bottom: 15px;">
                <strong>Reasoning:</strong> ${result.reasoning}
            </div>
            ${result.alternatives ? `
                <div>
                    <strong>Alternative Categories:</strong>
                    <ul>
                        ${result.alternatives.map(alt => 
                            `<li>${alt.category} (${Math.round(alt.confidence * 100)}%)</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
        
        resultsDiv.style.display = 'block';
    }
});