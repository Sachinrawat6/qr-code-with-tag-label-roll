// Centralised base URL — change once, propagate everywhere.
export const API_BASE_URL = 'https://raw-material-backend.onrender.com';

// goqr.me / qrserver — free, no aggressive rate limit, supports `size` & `margin`.
export const QR_IMAGE_BASE = 'https://api.qrserver.com/v1/create-qr-code/';
export const QR_DEFAULT_SIZE = 200; // px (rendered at 120px in CSS, 2x for retina)
export const QR_DEFAULT_MARGIN = 0;
