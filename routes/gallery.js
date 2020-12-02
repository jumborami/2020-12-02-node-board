const express = require('express');
const moment = require('moment');
const fs = require('fs-extra');
const createError = require('http-errors');
const router = express.Router();
const { sqlGen } = require('../modules/mysql-conn');
const { alert, uploadFolder, imgFolder, extGen } = require('../modules/util');
const { upload, imgExt } = require('../modules/multer-conn');
const pager = require('../modules/pager-conn');
const { isUser, isUserApi } = require('../modules/auth-conn');

router.get(['/', '/list', '/list/:page'], async (req, res, next) => {
	let page = req.params.page || 1;
	let connect, rs, pug;
	try {
		rs = await sqlGen('gallery', 'S', {field: ['count(id)']});
		let pagers = pager(page, rs[0][0]['count(id)'], {pagerCnt: 3, listCnt: 4});
		pug = {
			title: '갤러리', js: 'gallery', css: 'gallery', menu: 'gallery', 
			...pagers
		};
		rs = await sqlGen('gallery', 'S', { 
			order: ['id', 'DESC'], 
			limit: [pagers.startIdx, pagers.listCnt]
		});
		pug.lists = rs[0];
		pug.lists.forEach((v) => {
			v.wdate = moment(v.wdate).format('YYYY년 MM월 DD일');
			v.imgSrc = imgFolder(v.savefile);
		});
		res.render('./gallery/list.pug', pug);
	}
	catch(e) {
		next(createError(500, e.sqlMessage || e));
	}
});

router.get('/write', isUser, (req, res, next) => {
	const pug = {title: '갤러리 작성', js: 'gallery', css: 'gallery'};
	res.render('./gallery/write.pug', pug);
});

router.post('/save', isUser, upload.single('upfile'), async (req, res, next) => {
	let connect, rs;
	try {
		if(req.allow === false) res.send(alert(`${req.ext}은(는) 업로드 할 수 없습니다.`, '/gallery'));
		else {
			req.body.uid = req.session.user ? req.session.user.id : null;
			rs = await sqlGen('gallery', 'I', {
				field: ['title', 'writer', 'content', 'uid'], 
				data: req.body,
				file: req.file
			});
			res.redirect('/gallery');
		}
	}
	catch(e) {
		next(createError(500, e.sqlMessage || e));
	}
});

router.get('/view/:id', async (req, res) => {
	let connect, rs, pug;
	try {
		pug = {title: '갤러리 상세', js: ' gallery', css: 'gallery'};
		rs = await sqlGen('gallery', 'S', {where: ['id', req.params.id]});
		pug.list = rs[0][0];
		pug.list.wdate = moment(pug.list.wdate).format('YYYY-MM-DD HH:mm:ss');
		if(pug.list.savefile) {
			if(imgExt.includes(extGen(pug.list.savefile))) {
				pug.list.imgSrc = imgFolder(pug.list.savefile);
			}
		}
		res.render('./gallery/view.pug', pug);
	}
	catch(e) {
		next(createError(500, e.sqlMessage || e));
	}
});

router.get('/delete/:id', isUser, async (req, res, next) => {
	let connect, rs, temp;
	try {
		rs = await sqlGen('gallery', 'S', { where: {
			op: 'AND',
			fields: [['id', req.params.id], ['uid', req.session.user.id]]
		}, field: ['savefile']});
		if(rs[0][0].savefile) await fs.remove(uploadFolder(rs[0][0].savefile));
		rs = await sqlGen('gallery', 'D', {
			where: {
				op: 'AND',
				fields: [['id', req.params.id], ['uid', req.session.user.id]]
			}
		});
		res.send(alert('삭제되었습니다', '/gallery'));
	}
	catch(e) {
		next(createError(500, e.sqlMessage || e));
	}
});

router.get('/update/:id', isUser, async (req, res, next) => {
	let connect, rs, pug;
	try {
		pug = {title: '갤러리 수정', js: 'gallery', css: 'gallery'};
		rs = await sqlGen('gallery', 'S', {
			where: {
				op: 'AND',
				fields: [['id', req.params.id], ['uid', req.session.user.id]]
			}
		});
		pug.list = rs[0][0];
		res.render('./gallery/write.pug', pug);
	}
	catch(e) {
		next(createError(500, e.sqlMessage || e));
	}
});

router.post('/saveUpdate', isUser, upload.single('upfile'), async (req, res, next) => {
	let connect, rs;
	try {
		if(req.allow === false) res.send(alert(`${req.ext}은(는) 업로드 할 수 없습니다.`, '/gallery'));
		else {
			if(req.file) {
				rs = await sqlGen('gallery', 'S', {
					where: {
						op: 'AND',
						fields: [['id', req.body.id], ['uid', req.session.user.id]]
					}, field: ['savefile']});
				if(rs[0][0].savefile) await fs.remove(uploadFolder(rs[0][0].savefile));
			}
			rs = await sqlGen('gallery', 'U', { 
				where: {
					op: 'AND',
					fields: [['id', req.body.id], ['uid', req.session.user.id]]
				}, 
				field: ['title', 'writer', 'content'],
				data: req.body,
				file: req.file
			});
			res.send(alert('수정되었습니다', '/gallery'));
		}
	}
	catch(e) {
		next(createError(500, e.sqlMessage || e));
	}
});

router.get('/download', (req, res, next) => {
	let { file: saveFile, name: realFile } = req.query;
	res.download(uploadFolder(saveFile), realFile);
});

router.get('/fileRemove/:id', isUserApi, async (req, res, next) => {
	let connect, rs;
	try {
		rs = await sqlGen('gallery', 'S', {
			where: {
				op: 'AND',
				fields: [['id', req.params.id], ['uid', req.session.user.id]],
			}, 
			field: ['savefile']});
		if(rs[0][0].savefile) await fs.remove(uploadFolder(rs[0][0].savefile));
		rs = await sqlGen('gallery', 'U', {
			where: {
				op: 'AND',
				fields: [['id', req.params.id], ['uid', req.session.user.id]],
			},
			field: ['realfile', 'savefile'],
			data: {realfile: null, savefile: null}
		});
		res.json({code: 200});
	}
	catch(e) {
		res.json({code: 500, err: e});
	}
});

module.exports = router;