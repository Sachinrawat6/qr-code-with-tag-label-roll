import axios from 'axios';
import {
  API_BASE_URL,
  QR_DEFAULT_SIZE,
  QR_DEFAULT_MARGIN,
  QR_IMAGE_BASE,
} from '../constants/index.js';
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

/** GET /api/v1/style-details — returns array of fabric/style records. */
export const fetchStyleDetails = async () => {
  const res = await api.get('/api/v1/style-details');
  return res.data?.data ?? [];
};

/**
 * Build a QR image URL for a given payload.
 * Uses api.qrserver.com (no rate limit for typical print volumes).
 */
export const buildQrImageUrl = (
  data,
  { size = QR_DEFAULT_SIZE, margin = QR_DEFAULT_MARGIN } = {}
) => {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    margin: String(margin),
    data: data ?? '',
  });
  return `${QR_IMAGE_BASE}?${params.toString()}`;
};

export default api;
