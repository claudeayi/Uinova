import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk";
import axios from "axios";

const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: "2022-11-15" });

// Stripe Payment
export async function createStripePayment(amount, currency="usd") {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency,
    automatic_payment_methods: { enabled: true }
  });
  return paymentIntent.client_secret;
}

// PayPal Payment
export async function createPayPalPayment(amount, currency="USD") {
  const env = new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET);
  const client = new paypal.core.PayPalHttpClient(env);

  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{ amount: { currency_code: currency, value: amount.toString() } }]
  });

  const response = await client.execute(request);
  return response.result;
}

// CinetPay Payment
export async function createCinetPayPayment(amount, currency="XAF") {
  const res = await axios.post("https://api-checkout.cinetpay.com/v2/payment", {
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: Date.now().toString(),
    amount,
    currency,
    description: "UInova Payment",
    notify_url: process.env.CINETPAY_NOTIFY_URL,
    return_url: process.env.CINETPAY_RETURN_URL,
  });
  return res.data;
}
