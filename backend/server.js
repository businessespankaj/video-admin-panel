const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ======================
// CASHFREE CONFIG
// ======================
const CASHFREE_APP_ID = "YOUR_APP_ID";
const CASHFREE_SECRET = "YOUR_SECRET_KEY";
const CASHFREE_BASE_URL = "https://api.cashfree.com/pg/orders";

// ======================
// CREATE ORDER API
// ======================
app.post("/create-order", async (req, res) => {
    try {
        const { orderId, amount, customerPhone } = req.body;

        const response = await fetch(CASHFREE_BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-client-id": CASHFREE_APP_ID,
                "x-client-secret": CASHFREE_SECRET,
                "x-api-version": "2022-09-01"
            },
            body: JSON.stringify({
                order_id: orderId,
                order_amount: amount,
                order_currency: "INR",
                customer_details: {
                    customer_id: "user_" + Date.now(),
                    customer_phone: customerPhone || "9999999999"
                },
                order_meta: {
                    return_url: "https://yourblog.blogspot.com/success.html"
                }
            })
        });

        const data = await response.json();
        res.json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================
// WEBHOOK (PAYMENT VERIFY)
// ======================
app.post("/webhook", async (req, res) => {
    try {
        console.log("Payment Webhook:", req.body);

        const order = req.body.order;

        if (order.order_status === "PAID") {
            // TODO: Firestore update
            console.log("Payment Successful:", order.order_id);
        }

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
