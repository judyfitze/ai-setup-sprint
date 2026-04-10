const logs = global.__AI_SETUP_STRIPE_DEBUG__ || (global.__AI_SETUP_STRIPE_DEBUG__ = []);

function addLog(entry) {
  logs.push({ at: new Date().toISOString(), ...entry });
  if (logs.length > 50) logs.splice(0, logs.length - 50);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const event = req.body || {};
    
    addLog({ stage: 'received_body', formType: event.formType, hasEmail: !!event.email, bodyKeys: Object.keys(event) });
    
    // Handle inquiry form submissions (non-Stripe)
    if (event.formType === 'inquiry') {
      addLog({ stage: 'processing_inquiry', email: event.email });
      const nameParts = String(event.name || '').trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts.length ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const gcApiKey = process.env.GC_API_KEY || '21c6ddbd3338d2e75cffd56f6b6c3ed6bf419e870393e0a0bd02c985565d39ab';
      const inquiryTagId = '69d7c5cad97ab99f0362ee92';
      
      const firePayload = {
        email: event.email,
        firstName: firstName,
        lastName: lastName,
        phone: event.phone || ''
      };
      
      const fireResp = await fetch(`https://api.globalcontrol.io/api/ai/tags/fire-tag/${inquiryTagId}`, {
        method: 'POST',
        headers: {
          'X-API-KEY': gcApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(firePayload)
      });
      
      const fireText = await fireResp.text();
      
      if (!fireResp.ok) {
        return res.status(500).json({ ok: false, error: 'gc_fire_failed', details: fireText });
      }
      
      return res.status(200).json({ ok: true, type: 'inquiry', email: event.email, tagId: inquiryTagId });
    }
    
    const type = event.type;
    addLog({ stage: 'received', type, bodyKeys: Object.keys(event || {}) });
    if (type !== 'checkout.session.completed') {
      addLog({ stage: 'ignored_type', type });
      return res.status(200).json({ ok: true, ignored: true, type });
    }

    const obj = event.data && event.data.object ? event.data.object : {};
    const paymentLink = String(obj.payment_link || '').trim();
    const allowedPaymentLinks = String(process.env.AI_SETUP_PAYMENT_LINK_ID || 'plink_1TJgqiPbIAnZauummLwnnXIn')
      .split(',')
      .map(s => String(s).trim())
      .filter(Boolean);

    addLog({
      stage: 'parsed_checkout',
      eventId: event.id || null,
      paymentLink,
      allowedPaymentLinks,
      email: (obj.customer_details && obj.customer_details.email) || obj.customer_email || null,
      name: (obj.customer_details && (obj.customer_details.name || obj.customer_details.individual_name)) || null,
      amount_total: obj.amount_total,
      payment_status: obj.payment_status
    });

    if (!allowedPaymentLinks.includes(paymentLink)) {
      addLog({ stage: 'ignored_wrong_payment_link', paymentLink, allowedPaymentLinks });
      return res.status(200).json({ ok: true, ignored: true, reason: 'wrong_payment_link', paymentLink, allowedPaymentLinks });
    }

    const email = obj.customer_details && obj.customer_details.email ? obj.customer_details.email : obj.customer_email;
    const fullName = obj.customer_details && (obj.customer_details.name || obj.customer_details.individual_name) ? (obj.customer_details.name || obj.customer_details.individual_name) : '';

    if (!email) {
      addLog({ stage: 'ignored_missing_email', eventId: event.id || null });
      return res.status(200).json({ ok: true, ignored: true, reason: 'missing_email' });
    }

    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts.length ? parts[0] : '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

    const gcApiKey = process.env.GC_API_KEY;
    const buyerTagId = process.env.GC_BUYER_ACTIVE_TAG_ID || '69d6e6fad97ab99f0310724a';

    const firePayload = {
      email,
      firstName,
      lastName
    };

    addLog({ stage: 'gc_fire_attempt', buyerTagId, firePayload });

    const fireResp = await fetch(`https://api.globalcontrol.io/api/ai/tags/fire-tag/${buyerTagId}`, {
      method: 'POST',
      headers: {
        'X-API-KEY': gcApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(firePayload)
    });

    const fireText = await fireResp.text();
    addLog({ stage: 'gc_fire_response', ok: fireResp.ok, status: fireResp.status, body: fireText.slice(0, 2000) });

    if (!fireResp.ok) {
      return res.status(500).json({ ok: false, error: 'gc_fire_failed', details: fireText });
    }

    return res.status(200).json({ ok: true, email, tagId: buyerTagId, details: fireText });
  } catch (err) {
    addLog({ stage: 'error', error: String(err), stack: err && err.stack ? String(err.stack).slice(0, 2000) : null });
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
