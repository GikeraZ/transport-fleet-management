const express = require('express');
const { verifyToken } = require('../middleware');
const fuelController = require('../controllers/fuelController');

const router = express.Router();

router.get('/', verifyToken, fuelController.list);
router.post('/', verifyToken, fuelController.create);
router.get('/stats', verifyToken, fuelController.stats);

module.exports = router;
