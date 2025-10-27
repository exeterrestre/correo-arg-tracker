require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrapeStatus, checkStatus } = require('./scrapper');

const app = express();
app.use(cors());
app.use(express.json());

let trackingNumber = '00011079989791II1A51401';
let emailToNotify = 'fransappia01@gmail.com';
let intervalMinutes = 20;

app.get('/track/:id', async (req, res) => {
    const trackingNumber = req.params.id;
    try {
        const status = await scrapeStatus(trackingNumber);
        res.json({ status });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

setInterval(() => {
    checkStatus(trackingNumber, emailToNotify);
}, intervalMinutes * 60 * 1000);

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`));
