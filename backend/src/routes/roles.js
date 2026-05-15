const express = require('express');
const { verifyToken, authorize } = require('../middleware');
const roleController = require('../controllers/roleController');

const router = express.Router();

router.get('/', verifyToken, authorize(['admin', 'superadmin']), roleController.listRoles);
router.get('/permissions', verifyToken, authorize(['admin', 'superadmin']), roleController.listPermissions);
router.get('/:id/permissions', verifyToken, authorize(['admin', 'superadmin']), roleController.rolePermissions);
router.post('/assign-permission', verifyToken, authorize(['admin', 'superadmin']), roleController.assignPermission);
router.post('/', verifyToken, authorize(['admin', 'superadmin']), roleController.createRole);
router.delete('/:id', verifyToken, authorize(['admin', 'superadmin']), roleController.deleteRole);

module.exports = router;
