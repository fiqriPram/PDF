// node-api-gateway/server.js
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const PYTHON_CONVERTER_URL = 'http://localhost:5000/convert'; // Alamat layanan Python

// Konfigurasi Multer untuk menyimpan file di 'shared-storage'
const upload = multer({
    dest: path.join(__dirname, '../shared-storage/uploads/')
});

// Pastikan direktori ada
if (!fs.existsSync('../shared-storage/uploads/')) {
    fs.mkdirSync('../shared-storage/uploads/', { recursive: true });
}

// Rute Upload dan Konversi
app.post('/upload-convert', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const originalFilename = req.file.originalname;
    const filePath = req.file.path; // Lokasi file di shared-storage

    try {
        // 1. Panggil layanan Python untuk melakukan konversi
        const response = await axios.post(PYTHON_CONVERTER_URL, {
            filePath: filePath,
            outputFileName: originalFilename.replace(/\.[^/.]+$/, "") + '.pdf'
        });

        const resultFilePath = response.data.resultPath; // Ambil lokasi file hasil dari Python

        // 2. Kirim kembali informasi unduhan ke frontend
        res.status(200).json({
            message: 'Conversion successful',
            downloadPath: `/download/${path.basename(resultFilePath)}`
        });

    } catch (error) {
        console.error('Error during conversion process:', error.message);
        // Hapus file yang diupload jika terjadi error
        fs.unlink(filePath, () => { });
        res.status(500).send('Conversion failed.');
    }
});

// Rute Unduh (sederhana)
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../shared-storage/results/', filename);

    // Pastikan file hasil ada sebelum dikirim
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename);
    } else {
        res.status(404).send('File not found.');
    }
});


app.listen(PORT, () => {
    console.log(`Node.js API Gateway running on http://localhost:${PORT}`);
});