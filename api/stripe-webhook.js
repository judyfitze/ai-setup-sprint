module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const event = req.body || {};
    
    if (event.type === 'checkout.session.completed') {
      const obj = event.data?.object || {};
      const email = obj.customer_details?.email || obj.customer_email;
      const fullName = obj.customer_details?.name || '';
      
      if (!email) {
        return res.status(200).json({ ok: true, ignored: true, reason: 'missing_email' });
      }
      
      const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
      const firstName = parts.length ? parts[0] : '';
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
      
      const firePayload = { email, firstName, lastName };
      
      const fireResp = await fetch('https://api.globalcontrol.io/api/ai/tags/fire-tag/69d6e6fad97ab99f0310724a', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.GC_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(firePayload)
      });
      
      const fireText = await fireResp.text();
      
      if (!fireResp.ok) {
        return res.status(500).json({ ok: false, error: 'gc_fire_failed' });
      }
      
      return res.status(200).json({ ok: true, type: 'buyer', email });
    }
    
    return res.status(200).json({ ok: true, ignored: true, type: event.type });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
