module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const event = req.body || {};
    
    // Handle inquiry form
    if (event.formType === 'inquiry' || event.name) {
      const nameParts = String(event.name || '').trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts.length ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      // Build email notification body with all form fields
      const emailSubject = `AI Setup Sprint Inquiry: ${event.name || 'New Prospect'}`;
      const emailBody = `
New AI Setup Sprint Inquiry

CONTACT INFO
------------
Name: ${event.name || 'N/A'}
Email: ${event.email || 'N/A'}
Phone: ${event.phone || 'N/A'}

BUSINESS INFO
-------------
Business Name: ${event.business || 'N/A'}
Website: ${event.website || 'N/A'}
Business Type: ${event.type || 'N/A'}

QUALIFICATION
-------------
Biggest Bottleneck: ${event.bottleneck || 'N/A'}
Monthly Revenue: ${event.revenue || 'N/A'}
Timeline: ${event.timeline || 'N/A'}
Budget Comfort: ${event.budget || 'N/A'}

QUESTIONS
---------
${event.questions || 'None'}

---
Submitted: ${new Date().toISOString()}
`;

      // Send email notification via Global Control SMTP or external service
      // Using a simple SMTP relay approach - you'll need to configure this
      const emailPayload = {
        to: 'getsmartyclaw@gmail.com',
        subject: emailSubject,
        text: emailBody,
        from: 'inquiries@ai-setup-sprint.vercel.app'
      };

      // Try to send email (non-blocking - don't fail if email errors)
      try {
        await fetch('https://api.globalcontrol.io/api/ai/send-email', {
          method: 'POST',
          headers: {
            'X-API-KEY': '21c6ddbd3338d2e75cffd56f6b6c3ed6bf419e870393e0a0bd02c985565d39ab',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailPayload)
        });
      } catch (emailErr) {
        console.log('Email notification failed (non-critical):', emailErr.message);
      }
      
      // Fire Global Control tag
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
