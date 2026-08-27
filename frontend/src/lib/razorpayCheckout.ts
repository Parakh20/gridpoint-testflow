declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Loads Razorpay's checkout script on demand. Shared by every checkout entry
 * point (plan subscription, add-on order) so they cannot drift in how they
 * handle a failed load.
 *
 * Note `vercel.json`'s CSP must allow checkout.razorpay.com in script-src,
 * connect-src AND frame-src — the modal is an iframe.
 */
export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // A <script> left over from a FAILED attempt will never fire load/error
    // again, so attaching listeners to it would hang the retry forever.
    // window.Razorpay is undefined at this point, so any existing tag either
    // failed or is still in flight — dropping it and re-adding is safe and
    // makes "try again" actually retry.
    document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`)?.remove();

    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve();
      else reject(new Error('Razorpay checkout loaded but did not initialise'));
    };
    script.onerror = () => reject(new Error(
      'Failed to load Razorpay checkout — this is usually a Content-Security-Policy or network block.',
    ));
    document.body.appendChild(script);
  });
}
