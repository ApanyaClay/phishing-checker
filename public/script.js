const form = document.getElementById('url-form');
const urlInput = document.getElementById('url-input');
const loadingDiv = document.getElementById('loading');
const resultsContainer = document.getElementById('results-container');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');

const finalResultEl = document.getElementById('final-result');
const safeBrowseResultEl = document.getElementById('safe-Browse-result');
const geminiResultEl = document.getElementById('gemini-result');

form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah form mengirim data secara tradisional

    // Sembunyikan hasil lama dan tampilkan loading
    resultsContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
    loadingDiv.classList.remove('hidden');

    const url = urlInput.value;

    try {
        // Kirim URL ke backend kita
        const response = await fetch('/check-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Gagal mengambil data dari server.');
        }

        const data = await response.json();
        displayResults(data);

    } catch (error) {
        displayError(error.message);
    } finally {
        // Sembunyikan loading setelah selesai
        loadingDiv.classList.add('hidden');
    }
});

function displayResults(data) {
    // Tampilkan container hasil
    resultsContainer.classList.remove('hidden');

    // Tampilkan hasil dari setiap API
    safeBrowseResultEl.textContent = `Status: ${data.safeBrowse.status} - ${data.safeBrowse.reason}`;
    geminiResultEl.textContent = `Status: ${data.gemini.status} - ${data.gemini.reason}`;

    // Logika untuk menentukan kesimpulan akhir
    let finalStatus = 'AMAN';
    let finalReason = 'URL ini tampaknya aman berdasarkan kedua pemeriksaan.';
    let finalClass = 'safe';

    // Jika salah satu dari API menandai berbahaya, hasilnya berbahaya
    if (data.safeBrowse.status === 'BERBAHAYA' || data.gemini.status === 'BERBAHAYA') {
        finalStatus = 'BERBAHAYA';
        finalReason = 'URL ini terdeteksi BERBAHAYA. Sangat disarankan untuk tidak mengunjunginya.';
        finalClass = 'dangerous';
    } else if (data.gemini.status === 'MENCURIGAKAN') {
        finalStatus = 'MENCURIGAKAN';
        finalReason = 'URL ini dicurigai berpotensi tidak aman. Harap berhati-hati.';
        finalClass = 'suspicious';
    }

    finalResultEl.textContent = `${finalStatus}: ${finalReason}`;
    finalResultEl.className = ''; // Hapus kelas lama
    finalResultEl.classList.add(finalClass);
}

function displayError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
}