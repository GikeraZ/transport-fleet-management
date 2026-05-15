const express = require('express');
const { verifyToken, authorize, validateBody } = require('../middleware');
const mechanicController = require('../controllers/mechanicController');

const router = express.Router();

const mechanicSchema = {
  first_name: { required: true, type: 'string', minLength: 1 },
  last_name: { required: true, type: 'string', minLength: 1 },
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: 'string', minLength: 6 },
  specialization: { type: 'string', maxLength: 100 },
};

router.get('/', verifyToken, mechanicController.list);
router.get('/:id', verifyToken, mechanicController.getById);
router.post('/', verifyToken, authorize(['admin']), validateBody(mechanicSchema), mechanicController.create);
router.put('/:id', verifyToken, authorize(['admin']), mechanicController.update);
router.delete('/:id', verifyToken, authorize(['admin']), mechanicController.remove);

module.exports = router;
