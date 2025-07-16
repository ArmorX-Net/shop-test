// api/proxy.js
export default async function handler(req, res) {
  // Always set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      // Forward to Google Apps Script endpoint
      const googleResp = await fetch(
        'https://script.google.com/macros/s/AKfycbxIb3-J4n4Kt1sXBxcttdgcyQFSq7EZF_2eZ7H0r3ktRSXKSfkyRtWW7mr_DapkVh3nRA/exec',
        {
          method: 'POST',
          body: JSON.stringify(req.body),
          headers: { 'Content-Type': 'application/json' }
        }
      );
      // If Google Apps Script responds with JSON, use .json(); if with text, use .text()
      const data = await googleResp.text();
      res.status(200).send(data);
    } catch (err) {
      res.status(500).json({ error: 'Proxy failed', details: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
