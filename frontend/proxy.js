// Simple proxy to help with CORS issues
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const port = 8090;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static('.'));

// Proxy API requests to JSON Server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000', 
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

// Start server
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
  console.log(`API requests will be forwarded to http://localhost:3000`);
  
  // Add a simple test to verify the proxy is working
  fetch('http://localhost:3000/dinners')
    .then(response => response.json())
    .then(data => console.log(`✓ Successfully connected to JSON server (${data.length} dinners found)`))
    .catch(error => console.error(`✗ Error connecting to JSON server: ${error.message}`));
});
