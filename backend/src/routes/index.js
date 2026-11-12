const express = require('express');
const { authOptional } = require('../middleware/auth');

const router = express.Router();

router.use(authOptional);
router.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
router.use('/auth', require('./auth'));
router.use('/payment', require('./payment'));
router.use('/admin', require('./admin'));
router.use('/', require('./public'));

module.exports = router;
