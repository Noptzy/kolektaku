import axios from 'axios';

const textLines = Array.from({ length: 50 }, (_, i) => `[${i}] Hello world, this is a test sentence number ${i}.`);
const textBlock = textLines.join('\n');

async function testBatch() {
    console.log("Sending batch request (50 lines)...");
    try {
        const response = await axios.post('http://localhost:3002/translate-google', {
            text: textBlock,
            from: 'en',
            to: 'id'
        });

        console.log("Status:", response.status);
        const translated = response.data.text;
        console.log("Response length:", translated.length);
        console.log("First 5 lines:");
        console.log(translated.split('\n').slice(0, 5).join('\n'));

        if (translated.includes("Hello world")) {
            console.log("\nFAIL: Output is still English!");
        } else if (translated.includes("Halo dunia")) {
            console.log("\nSUCCESS: Output is Indonesian!");
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

testBatch();
