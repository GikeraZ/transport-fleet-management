const express = require('express');
const { verifyToken, authorize } = require('../middleware');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/', verifyToken, authorize(['admin', 'superadmin']), userController.list);
router.post('/', verifyToken, authorize(['admin', 'superadmin']), userController.create);
router.get('/profile', verifyToken, userController.profile);
router.get('/:id', verifyToken, userController.getById);
router.put('/:id', verifyToken, userController.update);
router.delete('/:id', verifyToken, authorize(['admin', 'superadmin']), userController.remove);
router.get('/:id/activity', verifyToken, userController.activity);
router.get('/:id/permissions', verifyToken, userController.permissions);

module.exports = router;
