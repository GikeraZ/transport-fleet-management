const express = require('express');
const { verifyToken, authorize } = require('../middleware');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/farms', verifyToken, authorize(['admin']), reportController.farms);
router.get('/vehicles/status', verifyToken, authorize(['admin']), reportController.vehicleStatus);
router.get('/maintenance/stats', verifyToken, authorize(['admin']), reportController.maintenanceStats);
router.get('/trips/analytics', verifyToken, authorize(['admin']), reportController.tripAnalytics);
router.get('/drivers/performance', verifyToken, authorize(['admin']), reportController.driverPerformance);
router.get('/operational/summary', verifyToken, authorize(['admin']), reportController.operationalSummary);

module.exports = router;
