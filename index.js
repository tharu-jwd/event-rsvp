const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.json({
        message: 'Hello from AWS! Deployed via Docker + GitHub Actions',
        timestamp: new Date().toISOString(),
        version: process.env.VERSION || '1.0.0'
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
