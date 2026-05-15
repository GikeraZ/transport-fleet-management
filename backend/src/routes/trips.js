const express = require('express');
const { verifyToken, authorize } = require('../middleware');
const tripController = require('../controllers/tripController');

const router = express.Router();

router.get('/', verifyToken, tripController.list);
router.get('/available', verifyToken, tripController.available);
router.get('/my-trips', verifyToken, tripController.myTrips);
router.get('/my-requests', verifyToken, tripController.myRequests);
router.get('/:id', verifyToken, tripController.getById);
router.post('/check-conflict', verifyToken, tripController.checkConflict);
router.post('/client-request', verifyToken, tripController.clientRequest);
router.post('/:id/claim', verifyToken, tripController.claim);
router.post('/:id/accept', verifyToken, tripController.accept);
router.get('/driver/:driverId', verifyToken, tripController.driverTrips);
router.post('/', verifyToken, authorize(['admin']), tripController.create);
router.put('/:id', verifyToken, tripController.update);
router.delete('/:id', verifyToken, authorize(['admin']), tripController.remove);

module.exports = router;
