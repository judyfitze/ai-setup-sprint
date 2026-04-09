module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const event = req.body || {};
    const type = event.type;
    if (type !== 'checkout.session.completed') {
      return res.status(200).json({ ok: true, ignored: true, type });
    }

    const obj = event.data && event.data.object ? event.data.object : {};
    const paymentLink = String(obj.payment_link || '').trim();
    const allowedPaymentLinks = String(process.env.AI_SETUP_PAYMENT_LINK_ID || 'plink_1TJgqiPbIAnZauummLwnnXIn')
      .split(',')
      .map(s => String(s).trim())
      .filter(Boolean);

    if (!allowedPaymentLinks.includes(paymentLink)) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'wrong_payment_link', paymentLink, allowedPaymentLinks });
    }

    const email = obj.customer_details && obj.customer_details.email ? obj.customer_details.email : obj.customer_email;
    const fullName = obj.customer_details && obj.customer_details.name ? obj.customer_details.name : '';

    if (!email) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'missing_email' });
    }

    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts.length ? parts[0] : '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

    const gcApiKey = process.env.GC_API_KEY;
    const buyerTagId = process.env.GC_BUYER_ACTIVE_TAG_ID || '69d6e6fad97ab99f0310724a';

    const fireResp = await fetch(`https://api.globalcontrol.io/api/ai/tags/fire-tag/${buyerTagId}`, {
      method: 'POST',
      headers: {
        'X-API-KEY': gcApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        firstName,
        lastName
      })
    });

    const fireText = await fireResp.text();
    if (!fireResp.ok) {
      return res.status(500).json({ ok: false, error: 'gc_fire_failed', details: fireText });
    }

    return res.status(200).json({ ok: true, email, tagId: buyerTagId, details: fireText });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
