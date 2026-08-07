// Marketing-site links out to the operator portal for authentication.
// Sign in / Start free live on the app, not on this public marketing site.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5001";
export const LOGIN_URL = `${APP_URL}/login`;
export const REGISTER_URL = `${APP_URL}/register`;
// Public retail marketplace — anyone can browse/buy across every Kuza store.
export const SHOP_URL = `${APP_URL}/shop`;
