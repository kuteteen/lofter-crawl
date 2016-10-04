'use strict';
/**
 * 这个文件中保存了所有的路由信息，而这些路由指向的是 controller 中的方法
 */
const router = require('express').Router();
const postController = require('../controllers/post');

router.get('/image/:index', postController.getImageUrl);

module.exports = router;
