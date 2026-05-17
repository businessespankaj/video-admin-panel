const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();

app.use(cors());
app.use(bodyParser.json());

/* ======================
   ROOT TEST ROUTE
====================== */
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Cashfree backend running successfully 🚀"
    });
});

/* ======================
   CASHFREE CONFIG
   (Values will be read from Render Environment Variables)
====================== */
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET;
const CASHFREE_BASE_URL = "https://api.cashfree.com/pg/orders";

/* ======================
   CREATE ORDER API
====================== */
app.post("/create-order", async (req, res) => {
  try {
    const { orderId, amount, customerPhone } = req.body;

    const response = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET,
        "x-api-version": "2025-01-01"
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: "cust_" + Date.now(),
          customer_phone: customerPhone || "9999999999",
          customer_email: "test@gmail.com"
        },
        order_meta: {
          return_url: "https://businessespankaj.github.io/video-admin-panel/payment.html"
        }
      })
    });

    const data = await response.json();
    console.log("Cashfree Response:", data);

    return res.json({
      payment_session_id: data.payment_session_id,
      order_id: data.order_id,
      raw: data
    });

  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

/* ======================
   WEBHOOK (PAYMENT VERIFY)
====================== */
app.post("/webhook", async (req, res) => {
    try {
        console.log("Payment Webhook Received:", req.body);

        const order = req.body?.order;

        if (order && order.order_status === "PAID") {
            console.log("Payment Successful:", order.order_id);

            // TODO: Yahan baad me Firestore update karenge
        }

        res.json({
            success: true
        });

    } catch (error) {
        console.log("Webhook Error:", error);
        res.status(500).json({
            error: error.message
        });
    }
});

/* ======================
   START SERVER
====================== */
app.post("/get-link", async (req, res) => {
    try {
        const { videoId } = req.body;

        if (!videoId) {
            return res.status(400).json({
                error: "videoId is required"
            });
        }

        const admin = require("firebase-admin");

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
            });
        }

        const firestore = admin.firestore();

        const doc = await firestore.collection("videos").doc(videoId).get();

        if (!doc.exists) {
            return res.status(404).json({
                error: "Video not found"
            });
        }

        const data = doc.data();

        res.json({
            success: true,
            title: data.title,
            fileLink: data.fileLink
        });

    } catch (error) {
        console.error("GET LINK ERROR:", error);
        res.status(500).json({
            error: error.message
        });
    }
});
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
