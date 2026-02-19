require('dotenv').config();

exports.verifyCode = async (req, res) => {
    const { code } = req.body;
    try {
        if (String(code).trim() === String(process.env.ADMIN_PASSCODE).trim()) {
            res.json({ success: true, message: 'Access Granted' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid Passcode' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Verification failed' });
    }
};
