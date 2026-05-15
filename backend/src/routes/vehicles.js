const express = require('express');
const { verifyToken, authorize, validateBody } = require('../middleware');
const vehicleController = require('../controllers/vehicleController');

const router = express.Router();

const vehicleSchema = {
  license_plate: { required: true, type: 'string', minLength: 1, maxLength: 20 },
  vehicle_type: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  make: { type: 'string', maxLength: 50 },
  model: { type: 'string', maxLength: 50 },
  year: { type: 'number', min: 1900, max: 2100 },
  capacity: { type: 'number', min: 1 },
  status: { type: 'string', maxLength: 20 },
  vin: { type: 'string', maxLength: 17 },
};

router.get('/', verifyToken, vehicleController.list);
router.get('/:id', verifyToken, vehicleController.getById);
router.post('/', verifyToken, authorize(['admin']), validateBody(vehicleSchema), vehicleController.create);
router.put('/:id', verifyToken, authorize(['admin']), vehicleController.update);
router.delete('/:id', verifyToken, authorize(['admin']), vehicleController.remove);

module.exports = router;
