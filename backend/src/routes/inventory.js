const express = require('express');
const { verifyToken, authorize } = require('../middleware');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

router.get('/', verifyToken, inventoryController.list);
router.get('/:id', verifyToken, inventoryController.getById);
router.post('/', verifyToken, authorize(['admin']), inventoryController.create);
router.put('/:id', verifyToken, authorize(['admin']), inventoryController.update);
router.delete('/:id', verifyToken, authorize(['admin']), inventoryController.remove);
router.post('/:id/use', verifyToken, authorize(['admin']), inventoryController.useItem);

module.exports = router;
