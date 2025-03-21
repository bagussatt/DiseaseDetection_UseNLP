const express = require('express');
const router = express.Router();
const penyakitController = require('../controllers/penyakitController');

// Rute untuk mendapatkan persentase penyakit
router.get('/persentase-penyakit', penyakitController.getPersentasePenyakit);

// Rute untuk memproses teks
router.post('/process', penyakitController.processText);

router.get('/persentase-penyakit/:penyakit', penyakitController.getPersentaseSpesifik);

module.exports = router;
