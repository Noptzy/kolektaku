import axios from 'axios';

async function testTranslation() {
    const textToTranslate = "I am happy and you are great.";

    try {
        console.log(`Sending: "${textToTranslate}"`);
        const response = await axios.post('http://localhost:3002/translate-google', {
            text: textToTranslate,
            from: 'en',
            to: 'id'
        });

        console.log("Response:", response.data);

        const translated = response.data.text;
        if (translated.includes('Aku') || translated.includes('Kamu')) {
            console.log("PASS: Informal styling detected.");
        } else {
            console.log("WARNING: Informal styling NOT detected (might be context dependent, or failed).");
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

testTranslation();
