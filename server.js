const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

// Memuat variabel lingkungan dari file .env
dotenv.config();

// Inisialisasi aplikasi Express
const app = express();
const port = 3150;

// Middleware
app.use(cors()); // Mengizinkan permintaan dari domain lain (frontend kita)
app.use(express.json()); // Memungkinkan server membaca JSON dari body permintaan
app.use(express.static('public')); // Menyajikan file statis dari folder 'public'

// Konfigurasi API
const safeBrowseApiKey = process.env.GOOGLE_SAFE_Browse_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Endpoint utama untuk memeriksa URL
app.post('/check-url', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL tidak boleh kosong.' });
    }

    try {
        // Gabungkan hasil dari kedua pemeriksaan
        const [safeBrowseResult, geminiResult] = await Promise.all([
            checkWithSafeBrowse(url),
            checkWithGemini(url)
        ]);

        // Kirim respons gabungan ke frontend
        res.json({
            url,
            safeBrowse: safeBrowseResult,
            gemini: geminiResult
        });

    } catch (error) {
        console.error('Error during check:', error);
        res.status(500).json({ error: 'Terjadi kesalahan di server.' });
    }
});

// Fungsi untuk memeriksa dengan Google Safe Browse
async function checkWithSafeBrowse(url) {
    const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${safeBrowseApiKey}`;
    const requestBody = {
        client: {
            clientId: 'my-phishing-checker-app',
            clientVersion: '1.0.0'
        },
        threatInfo: {
            threatTypes: ['THREAT_TYPE_UNSPECIFIED', 'MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: url }]
        }
    };

    try {
        const response = await axios.post(apiUrl, requestBody);
        if (response.data && response.data.matches) {
            return { status: 'BERBAHAYA', reason: `Terdeteksi sebagai ${response.data.matches[0].threatType}.` };
        } else {
            return { status: 'AMAN', reason: 'Tidak ditemukan ancaman dalam database Google Safe Browse.' };
        }
    } catch (error) {
        console.error('Safe Browse Error:', error.response ? error.response.data : error.message);
        return { status: 'ERROR', reason: 'Gagal memeriksa dengan Google Safe Browse.' };
    }
}

// Fungsi untuk memeriksa dengan Gemini API
async function checkWithGemini(url) {
    const prompt = `
        Analisis URL berikut ini dan tentukan apakah URL tersebut berpotensi sebagai phishing atau berbahaya.
        URL: "${url}"

        Berikan jawaban dalam format JSON dengan struktur berikut:
        {
          "status": "AMAN" | "MENCURIGAKAN" | "BERBAHAYA",
          "reason": "Jelaskan secara singkat alasanmu di sini. Fokus pada pola URL seperti penggunaan subdomain yang aneh, nama domain yang meniru merek terkenal, atau penggunaan karakter yang tidak biasa."
        }

        Contoh analisis:
        - Jika URL adalah "http://g00gle.com/login", statusnya "BERBAHAYA" karena menggunakan angka '0' untuk meniru 'o'.
        - Jika URL adalah "https://secure-login-facebook.com-update.xyz/signin", statusnya "BERBAHAYA" karena menggunakan subdomain berlapis untuk menipu.
        - Jika URL adalah "https://github.com/google/generative-ai-js", statusnya "AMAN" karena ini adalah URL yang sah dari domain terpercaya.

        Sekarang, analisis URL yang diberikan.
    `;

    try {
        const result = await geminiModel.generateContent(prompt);
        const responseText = result.response.text();
        // Membersihkan teks respons untuk memastikan itu adalah JSON yang valid
        const jsonString = responseText.replace(/```json\n|```/g, '').trim();
        const jsonResponse = JSON.parse(jsonString);
        return jsonResponse;
    } catch (error) {
        console.error('Gemini Error:', error);
        return { status: 'ERROR', reason: 'Gagal menganalisis dengan Gemini API.' };
    }
}


// Menjalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});