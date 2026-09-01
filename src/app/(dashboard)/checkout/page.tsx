"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  loadStripe,
  type Stripe,
  type StripeElements,
} from "@stripe/stripe-js";
import {
  Lock,
  ShoppingBag,
  MapPin,
  AlertTriangle,
  Loader2,
  CheckCircle,
  CreditCard,
} from "lucide-react";
import { api } from "@/lib/api";
import type { CartData } from "@/types";

// ─── Stripe Setup ─────────────────────────────────────────────────────────────

let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();

  // Cart / order state
  const [cart, setCart] = useState<CartData | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);

  // Stripe state
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [stripeReady, setStripeReady] = useState(false);

  // Payment flow state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);

  // ─── Load cart ───────────────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (!data.cart || data.cart.items.length === 0) {
        router.replace("/cart");
        return;
      }
      setCart(data.cart);
    } catch {
      setCartError("Failed to load cart");
    } finally {
      setCartLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // ─── Init Stripe + mount Card Element ────────────────────────────────────────
  useEffect(() => {
    getStripe().then((s) => setStripe(s));
  }, []);

  // ─── Create PaymentIntent once cart is loaded ─────────────────────────────
  useEffect(() => {
    if (!cart || clientSecret) return;

    async function createIntent() {
      setCreatingIntent(true);
      try {
        const res = await api.post("/api/checkout/create-payment-intent", {});
        const data = await res.json();
        if (!res.ok) {
          setCartError(data.error || "Failed to initiate checkout");
          return;
        }
        setClientSecret(data.clientSecret);
        setOrderId(data.orderId);
      } catch {
        setCartError("Failed to connect to payment service");
      } finally {
        setCreatingIntent(false);
      }
    }

    createIntent();
  }, [cart, clientSecret]);

  // ─── Mount Stripe Card Element once we have a clientSecret ────────────────
  useEffect(() => {
    if (!stripe || !clientSecret || stripeReady) return;

    const els = stripe.elements({
      clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#059669", // emerald-600
          borderRadius: "8px",
          fontFamily: "system-ui, sans-serif",
        },
      },
    });

    const cardElement = els.create("payment");
    cardElement.mount("#stripe-payment-element");

    cardElement.on("ready", () => setStripeReady(true));

    setElements(els);
  }, [stripe, clientSecret, stripeReady]);

  // ─── Handle Pay ──────────────────────────────────────────────────────────────
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret || !orderId) return;

    setPaying(true);
    setPayError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}?payment=success`,
      },
    });

    if (error) {
      setPayError(error.message ?? "Payment failed. Please try again.");
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      setPaySuccess(true);
      setTimeout(() => {
        router.push(`/orders/${orderId}?payment=success`);
      }, 1500);
    } else {
      setPayError("Payment was not completed. Please try again.");
      setPaying(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (cartLoading || creatingIntent) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto mb-4" />
        <p className="text-gray-500">
          {cartLoading ? "Loading your cart…" : "Preparing secure checkout…"}
        </p>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">{cartError}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-red-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (paySuccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-9 w-9 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Payment successful!</h2>
        <p className="text-gray-500 mt-2">Redirecting to your order…</p>
      </div>
    );
  }

  const dispensaryName = cart?.items[0]?.dispensary.name ?? "";
  const dispensaryAddress = cart?.items[0]?.dispensary.address ?? "";

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" /> Order Summary
        </h2>
        <div className="space-y-2 mb-4">
          {cart?.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">
                {item.medication.name}{" "}
                <span className="text-gray-400">×{item.quantity}</span>
              </span>
              <span className="font-medium text-gray-900">
                R{(item.priceAtAdd * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">
            R{cart?.total.toFixed(2)}
          </span>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Click &amp; Collect from <strong>{dispensaryName}</strong>
            {dispensaryAddress && ` — ${dispensaryAddress}`}
          </span>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handlePay}>
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Details
          </h2>

          {/* Stripe Payment Element mounts here */}
          <div id="stripe-payment-element" className="min-h-[100px]">
            {!stripeReady && clientSecret && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              </div>
            )}
          </div>

          {payError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{payError}</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!stripeReady || paying || !elements}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Pay R{cart?.total.toFixed(2)}
            </>
          )}
        </button>

        <p className="mt-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secured by Stripe. Your payment details are encrypted.
        </p>
      </form>

      {/* Test card hint (dev only) */}
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <strong>Test card:</strong> 4242 4242 4242 4242 · Any future date · Any 3-digit CVC
        </div>
      )}
    </div>
  );
}
