
import { translate } from '@vitalets/google-translate-api';

async function test() {
    try {
        console.log("Testing Google Translate...");
        const res = await translate('Hello world', { to: 'id' });
        console.log("Result:", res.text);
    } catch (err) {
        console.error("Error:", err);
    }
}

test();
