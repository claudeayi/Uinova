import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_KEY as string, { apiVersion: "2023-10-16" });

export async function createStripeIntent(userId: number, amount: number) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "eur",
    metadata: { userId: String(userId) }
  });
  return paymentIntent.client_secret;
}

// Pour Paypal/Cinetpay : Ajoute ici tes fonctions analogues selon leur SDK
