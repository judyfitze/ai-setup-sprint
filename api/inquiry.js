module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const event = req.body || {};
    
    // Handle inquiry form
    if (event.formType === 'inquiry') {
      const nameParts = String(event.name || '').trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts.length ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const gcPayload = {
        email: event.email,
        firstName: firstName,
        lastName: lastName,
        phone: event.phone || ''
      };
      
      const fireResp = await fetch('https://api.globalcontrol.io/api/ai/tags/fire-tag/69d7c5cad97ab99f0362ee92', {
        method: 'POST',
        headers: {
          'X-API-KEY': '21c6ddbd3338d2e75cffd56f6b6c3ed6bf419e870393e0a0bd02c985565d39ab',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gcPayload)
      });
      
      const fireText = await fireResp.text();
      
      if (!fireResp.ok) {
        return res.status(500).json({ ok: false, error: 'gc_fire_failed', details: fireText });
      }
      
      return res.status(200).json({ ok: true, type: 'inquiry', email: event.email });
    }
    
    return res.status(400).json({ ok: false, error: 'Unknown form type' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
