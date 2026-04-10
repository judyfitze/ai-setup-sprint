export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const formData = req.body;
  
  // Prepare Global Control payload
  const nameParts = (formData.name || '').split(' ');
  const gcPayload = {
    email: formData.email,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    phone: formData.phone || ''
  };

  try {
    // Fire Global Control tag
    const gcResponse = await fetch('https://api.globalcontrol.io/api/ai/tags/fire-tag/69d7c5cad97ab99f0362ee92', {
      method: 'POST',
      headers: {
        'X-API-KEY': '21c6ddbd3338d2e75cffd56f6b6c3ed6bf419e870393e0a0bd02c985565d39ab',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gcPayload)
    });

    const gcResult = await gcResponse.json();

    // Also save to Google Sheet
    try {
      await fetch('https://script.google.com/macros/s/AKfycby8pFKi_fD1qozOgK6nlTeYcjpqab7wOfS2bh7a1bxTc--3gcYYo1ftgy0q2AaRND36fA/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(formData)
      });
    } catch (sheetErr) {
      console.log('Sheet backup failed (non-critical):', sheetErr);
    }

    return res.status(200).json({ 
      success: true, 
      gcResult: gcResult 
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}