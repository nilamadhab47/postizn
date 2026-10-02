const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export type RazorpayCheckoutOrder = {
  keyId: string;
  amount: number;
  currency: string;
  orderId?: string;
  subscriptionId?: string;
  name?: string;
  description?: string;
  email?: string;
  contactName?: string | null;
};

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_signature: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
};

type RazorpayFailure = {
  error?: { description?: string; reason?: string };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout only runs in the browser"));
  }
  if (window.Razorpay) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay Checkout")), {
        once: true,
      });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

export function openRazorpayModal(
  order: RazorpayCheckoutOrder,
): Promise<{ status: "paid"; payload: RazorpaySuccess } | { status: "dismissed" } | { status: "failed"; message: string }> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay Checkout did not load"));
      return;
    }
    const options: Record<string, unknown> = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.name ?? "postN",
      description: order.description ?? "postN plan",
      prefill: {
        email: order.email ?? "",
        name: order.contactName ?? "",
      },
      theme: { color: "#ffb020" },
      handler: (payload: RazorpaySuccess) => {
        resolve({ status: "paid", payload });
      },
      modal: {
        ondismiss: () => resolve({ status: "dismissed" }),
      },
    };
    if (order.subscriptionId) options.subscription_id = order.subscriptionId;
    else if (order.orderId) options.order_id = order.orderId;

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response) => {
      resolve({
        status: "failed",
        message: response.error?.description || response.error?.reason || "Payment failed",
      });
    });
    rzp.open();
  });
}
