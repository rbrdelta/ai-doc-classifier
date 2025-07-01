async function classifyDocument(text) {
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error-message');
    
    // Hide previous results and errors
    resultsDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
    
    try {
        const response = await fetch('/api/classify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Classification failed');
        }
        
        // Hide loading and show results
        loadingDiv.style.display = 'none';
        displayResults(data);
        
    } catch (error) {
        loadingDiv.style.display = 'none';
        showError(error.message);
    }
}

function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    const categoryElement = document.getElementById('primary-category');
    const confidenceElement = document.getElementById('confidence-score');
    const reasoningElement = document.getElementById('reasoning');
    const alternativesElement = document.getElementById('alternatives');
    
    // Update primary classification
    categoryElement.textContent = data.category;
    confidenceElement.textContent = `(${data.confidence}% confidence)`;
    
    // Update reasoning
    reasoningElement.textContent = data.reasoning;
    
    // Update alternative categories
    alternativesElement.innerHTML = '';
    if (data.alternatives && data.alternatives.length > 0) {
        data.alternatives.forEach(alt => {
            const li = document.createElement('li');
            li.textContent = `${alt.category} (${alt.confidence}%)`;
            alternativesElement.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No significant alternatives found';
        alternativesElement.appendChild(li);
    }
    
    resultsDiv.style.display = 'block';
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    errorText.textContent = message;
    errorDiv.style.display = 'block';
}

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('classifier-form');
    const textarea = document.getElementById('document-text');
    const button = document.getElementById('classifyBtn');
    
    console.log('Form found:', form);
    console.log('Textarea found:', textarea);
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const text = textarea.value.trim();
            
            if (!text) {
                showError('Please enter some document text to classify');
                return;
            }
            
            if (text.length > 10000) {
                showError('Document too long. Please limit to 10,000 characters.');
                return;
            }
            
            await classifyDocument(text);
        });
    }

    // Move character counter inside DOMContentLoaded
    if (textarea) {
        textarea.addEventListener('input', function() {
            const charCount = this.value.length;
            const counter = document.querySelector('.char-counter');
            if (counter) {
                counter.textContent = `${charCount}/10,000 characters`;
                
                if (charCount > 10000) {
                    counter.style.color = '#ef4444';
                } else {
                    counter.style.color = '#6b7280';
                }
            }
            
            const resultsDiv = document.getElementById('results');
            if (resultsDiv) {
                resultsDiv.style.display = 'none';
            }
        });
    }
}); // Only ONE closing brace here

// Analytics functionality
let analyticsVisible = false;

function toggleAnalytics() {
    const section = document.getElementById('analytics-section');
    const button = document.getElementById('analytics-toggle');
    
    analyticsVisible = !analyticsVisible;
    
    if (analyticsVisible) {
        section.style.display = 'block';
        button.textContent = '📊 Hide Analytics Dashboard';
        refreshAnalytics();
    } else {
        section.style.display = 'none';
        button.textContent = '📊 View Analytics Dashboard';
    }
}

async function refreshAnalytics() {
    try {
        const response = await fetch('/api/analytics');
        const data = await response.json();
        
        // Update key metrics
        document.getElementById('total-classifications').textContent = data.totalClassifications;
        document.getElementById('avg-response-time').textContent = data.avgResponseTime + 'ms';
        document.getElementById('error-rate').textContent = data.errorRate + '%';
        
        // Update confidence distribution
        const total = data.totalClassifications;
        if (total > 0) {
            const high = data.confidenceDistribution.high;
            const medium = data.confidenceDistribution.medium;
            const low = data.confidenceDistribution.low;
            
            document.getElementById('high-confidence-bar').style.width = (high / total * 100) + '%';
            document.getElementById('medium-confidence-bar').style.width = (medium / total * 100) + '%';
            document.getElementById('low-confidence-bar').style.width = (low / total * 100) + '%';
            
            document.getElementById('high-confidence-count').textContent = high;
            document.getElementById('medium-confidence-count').textContent = medium;
            document.getElementById('low-confidence-count').textContent = low;
        }
        
        // Update category breakdown
        const categoryContainer = document.getElementById('category-breakdown');
        categoryContainer.innerHTML = '';
        
        Object.entries(data.categoryBreakdown).forEach(([category, count]) => {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            categoryContainer.innerHTML += `
                <div class="category-item">
                    <span>${category}</span>
                    <span>${count} (${percentage}%)</span>
                </div>`;
        });
        
        // Update recent activity
        const recentContainer = document.getElementById('recent-activity');
        recentContainer.innerHTML = '';
        
        data.recentClassifications.forEach(item => {
            const time = new Date(item.timestamp).toLocaleTimeString();
            recentContainer.innerHTML += `
                <div class="recent-item">
                    <strong>${item.category}</strong> (${item.confidence}%) - ${time}
                    <br><small>Response: ${item.responseTime}ms</small>
                </div>`;
        });
        
    } catch (error) {
        console.error('Failed to fetch analytics:', error);
    }
}

// Bulk processing functionality
let bulkResults = [];

async function processBulkCSV() {
    const fileInput = document.getElementById('csv-upload');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a CSV file');
        return;
    }
    
    const progressDiv = document.getElementById('bulk-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const downloadBtn = document.getElementById('download-btn');
    
    progressDiv.style.display = 'block';
    downloadBtn.style.display = 'none';
    bulkResults = [];
    
    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header row, assume format: "text" or "id,text"
        const documents = lines.slice(1).map(line => {
            const parts = line.split(',');
            return parts.length > 1 ? parts.slice(1).join(',') : parts[0];
        });
        
        progressText.textContent = `Processing ${documents.length} documents...`;
        
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i].replace(/"/g, '').trim();
            
            if (doc) {
                try {
                    const response = await fetch('/api/classify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: doc })
                    });
                    
                    const result = await response.json();
                    
                    bulkResults.push({
                        document: doc.substring(0, 100) + (doc.length > 100 ? '...' : ''),
                        category: result.category,
                        confidence: result.confidence,
                        reasoning: result.reasoning
                    });
                    
                } catch (error) {
                    bulkResults.push({
                        document: doc.substring(0, 100) + (doc.length > 100 ? '...' : ''),
                        category: 'ERROR',
                        confidence: 0,
                        reasoning: error.message
                    });
                }
            }
            
            // Update progress
            const progress = ((i + 1) / documents.length) * 100;
            progressBar.style.width = progress + '%';
            progressText.textContent = `Processed ${i + 1} of ${documents.length} documents`;
            
            // Small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        progressText.textContent = `✅ Completed! Processed ${bulkResults.length} documents`;
        downloadBtn.style.display = 'inline-block';
        
    } catch (error) {
        progressText.textContent = '❌ Error processing file: ' + error.message;
    }
}

function downloadResults() {
    if (bulkResults.length === 0) return;
    
    // Create CSV content
    const headers = ['Document', 'Category', 'Confidence', 'Reasoning'];
    const csvContent = [
        headers.join(','),
        ...bulkResults.map(row => [
            `"${row.document.replace(/"/g, '""')}"`,
            row.category,
            row.confidence,
            `"${row.reasoning.replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classification_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}