const express = require('express');
const { verifyToken, authorize } = require('../middleware');
const maintenanceController = require('../controllers/maintenanceController');

const router = express.Router();

router.get('/', verifyToken, maintenanceController.list);
router.get('/:id', verifyToken, maintenanceController.getById);
router.post('/', verifyToken, authorize(['admin', 'mechanic']), maintenanceController.create);
router.put('/:id', verifyToken, maintenanceController.update);
router.delete('/:id', verifyToken, authorize(['admin']), maintenanceController.remove);
router.get('/vehicle/:vehicleId', verifyToken, maintenanceController.vehicleHistory);
router.post('/client-request', verifyToken, maintenanceController.clientRequest);

module.exports = router;
