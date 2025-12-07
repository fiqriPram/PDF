const express = require('express');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 8000; // Changed to 8000 to avoid conflict with Frontend (3000)
const PYTHON_CONVERTER_URL = 'http://localhost:5000/convert';

app.use(cors()); // Enable CORS for Frontend access

// Configure Multer for shared storage
// Use ../../ because api-gateway is in backend/api-gateway (depth 2)
const upload = multer({
    dest: path.join(__dirname, '../../shared-storage/uploads/')
});

// Ensure directory exists
const uploadDir = path.join(__dirname, '../../shared-storage/uploads/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Upload and Convert Route
app.post('/upload-convert', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const originalFilename = req.file.originalname;
    let filePath = req.file.path;

    // Appending extension is crucial for Python backend to detect .docx
    const ext = path.extname(originalFilename);
    const newFilePath = filePath + ext;
    fs.renameSync(filePath, newFilePath);
    filePath = newFilePath;

    try {
        // 1. Call Python Service
        const response = await axios.post(PYTHON_CONVERTER_URL, {
            filePath: filePath,
            outputFileName: originalFilename.replace(/\.[^/.]+$/, "") + '.pdf'
        });

        const resultFilePath = response.data.resultPath;

        // 2. Return success with Download URL
        // Frontend expects 'downloadUrl' from Gateway
        res.status(200).json({
            message: 'Conversion successful',
            downloadUrl: `http://localhost:${PORT}/download/${path.basename(resultFilePath)}`
        });

    } catch (error) {
        console.error('Error during conversion process:', error.message);
        if (error.response) console.error(error.response.data);
        fs.unlink(filePath, () => { }); // Cleanup
        res.status(500).json({ error: 'Conversion failed via Gateway' });
    }
});

// Download Route
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // Resolve path relative to shared-storage correctly from api-gateway directory
    const filePath = path.join(__dirname, '../../shared-storage/results/', filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath, filename);
    } else {
        console.error('Download: File not found at', filePath);
        res.status(404).send('File not found.');
    }
});


app.listen(PORT, () => {
    console.log(`Node.js API Gateway running on http://localhost:${PORT}`);
});