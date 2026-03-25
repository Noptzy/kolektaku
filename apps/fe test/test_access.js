import axios from 'axios';

const url = "https://stormshade84.live/_v7/211e3d0ad5c17d43eb0e9f806506b0652f2f844bdc71e5d95f7f5522fa2c31317eeaffd00a5f35f3628f5fcf4bd569d0c2f3bdc4d5d82a52362c0931447b68a923d395c410a89ae1e515fc462746d81ef651c5884a1b3d1b585a7300be82dc7e88e90127bee8cc5560605b69be6bad850e67595998c536280c847e8b13757699/master.m3u8";

const headers = {
    'Referer': 'https://rapid-cloud.co/',
    'Origin': 'https://rapid-cloud.co',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
};

async function test() {
    try {
        console.log("Testing URL:", url);
        const response = await axios.get(url, { headers });
        console.log("Success! Status:", response.status);
        console.log("Data length:", response.data.length);
        console.log("First 100 chars:", response.data.substring(0, 100));
    } catch (error) {
        console.error("Error Status:", error.response ? error.response.status : error.message);
        if (error.response) {
            console.error("Error Data:", error.response.data);
            console.error("Response Headers:", error.response.headers);
        }
    }
}

test();
