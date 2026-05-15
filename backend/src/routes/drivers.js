const express = require('express');
const { verifyToken, authorize, validateBody } = require('../middleware');
const driverController = require('../controllers/driverController');

const router = express.Router();

const driverSchema = {
  first_name: { required: true, type: 'string', minLength: 1 },
  last_name: { required: true, type: 'string', minLength: 1 },
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: 'string', minLength: 6 },
  phone: { type: 'string', maxLength: 20 },
  license_number: { required: true, type: 'string', minLength: 1 },
};

router.get('/', verifyToken, driverController.list);
router.get('/:id', verifyToken, driverController.getById);
router.post('/', verifyToken, authorize(['admin']), validateBody(driverSchema), driverController.create);
router.put('/:id', verifyToken, authorize(['admin']), driverController.update);
router.delete('/:id', verifyToken, authorize(['admin']), driverController.remove);

module.exports = router;
