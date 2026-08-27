// The public support address, published on the legal pages and used as the
// fallback contact wherever a form submission fails.
//
// Kept here rather than inlined per-page because it appears on /terms,
// /privacy, /refund-policy, /contact and the marketing demo form — five places
// that must never disagree, since Razorpay's website review checks that the
// address published in the policies is reachable.
export const SUPPORT_EMAIL = 'support@optimustesting.com';
