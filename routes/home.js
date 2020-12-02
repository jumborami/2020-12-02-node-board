const express = require('express');
const router = express.Router();
//const createError = require('http-errors');

//const { alert } = require('../modules/util');


router.get('/', (req, res, next) => {
	const pug = {title: 'Home', js: 'base', css: 'base'};
	res.render('../views/index', pug);
});






module.exports = router;