
import * as dotenv from "dotenv";
dotenv.config();

// MUST target the local Next.js server, NOT the external WAHA server
const WEBHOOK_URL = "http://localhost:3000/api/whatsapp/webhook";

async function testWebhook() {
    console.log("🚀 Testing Webhook End-to-End...");
    console.log("Target:", WEBHOOK_URL);

    // ⚠️ IMPORTANT: Change 'from' to YOUR real WhatsApp number (e.g. '62812...' ) to receive the reply!
    // If you use a fake number, the Agent will run but the WAHA reply will fail (500 Error).
    // Format: CountryCodePhoneNumber@s.whatsapp.net (e.g. 62812345678@s.whatsapp.net)
    const testPhoneNumber = "6283125180658@c.us";

    const payload = {
        session: "default",
        payload: {
            id: `test_msg_${Date.now()}`,
            from: testPhoneNumber,
            body: "Cek jadwal minggu ini",
            _data: { Info: { Sender: testPhoneNumber, Chat: testPhoneNumber, PushName: "TestUser" } }
        },
        timestamp: Date.now() / 1000
    };

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Failed. Ensure 'npm run dev' is running.");
        console.error(error);
    }
}

testWebhook();
