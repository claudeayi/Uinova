import { Request, Response } from "express";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_KEY as string);

export const stripeIntent = async (req: Request, res: Response) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: req.body.amount,
    currency: "eur",
    metadata: { userId: req.user.id }
  });
  res.json({ clientSecret: paymentIntent.client_secret });
};
