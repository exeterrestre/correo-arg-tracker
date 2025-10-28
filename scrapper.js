const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

let lastStatus = '';

async function scrapeStatus(trackingNumber) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--no-zygote'
        ]

    });

    const page = await browser.newPage();

    await page.goto('https://www.correoargentino.com.ar/formularios/e-commerce', { waitUntil: 'networkidle2' });

    await page.type('#numero', trackingNumber);
    await page.click('#btsubmit');
    await new Promise(resolve => setTimeout(resolve, 5000));

    let rows = [];
    try {
        rows = await page.$$eval('#no-more-tables tbody tr', trs =>
            trs.map(tr => {
                const fecha = tr.querySelector('td[data-title="Fecha:"]')?.innerText.trim() || '';
                const planta = tr.querySelector('td[data-title="Planta:"]')?.innerText.trim() || '';
                const historia = tr.querySelector('td[data-title="Historia:"]')?.innerText.trim() || '';
                return { fecha, planta, historia };
            })
        );
    } catch {
        rows = [];
    }

    await browser.close();

    if (rows.length === 0) return { status: 'Sin información', movimientos: [] };

    const ultimo = rows[0].historia;
    return { status: ultimo, movimientos: rows };
}

async function sendEmail(to, subject, text) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
    });
}

async function checkStatus(trackingNumber, email) {
    try {
        const { status, movimientos } = await scrapeStatus(trackingNumber);
        console.log('Último estado:', status);

        if (status !== lastStatus && lastStatus !== '') {
            const body = `Nuevo estado para el envío ${trackingNumber}:\n\n${status}\n\nHistorial completo:\n${movimientos.map(m => `${m.fecha} - ${m.historia}`).join('\n')}`;
            await sendEmail(email, 'Cambio de estado en tu paquete', body);
            console.log('Email enviado!');
        }

        lastStatus = status;
    } catch (e) {
        console.error('Error scraping:', e.message);
    }
}

module.exports = { scrapeStatus, sendEmail, checkStatus };
