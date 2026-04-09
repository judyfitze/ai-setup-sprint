const logs = global.__AI_SETUP_STRIPE_DEBUG__ || (global.__AI_SETUP_STRIPE_DEBUG__ = []);

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, logs: logs.slice(-20) });
  }

  if (req.method === 'DELETE') {
    logs.length = 0;
    return res.status(200).json({ ok: true, cleared: true });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};
