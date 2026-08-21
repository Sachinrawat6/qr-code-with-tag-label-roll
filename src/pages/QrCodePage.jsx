import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Printer, Upload, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useProducts } from '../context/ProductsContext.jsx';
import { fetchStyleDetails } from '../services/api.js';
import QrCard from '../components/QrCard.jsx';

// Number of cards captured in parallel during PDF export.
// Higher = faster but heavier on the browser while exporting.
const EXPORT_CONCURRENCY = 10;

const QrCodePage = () => {
  const { products } = useProducts();
  const [styleDetails, setStyleDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const cardsRef = useRef(null);

  // Fetch fabric/style details once on mount.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchStyleDetails();
        if (!cancelled) setStyleDetails(data);
      } catch (err) {
        console.error('fetchStyleDetails error:', err);
        if (!cancelled) setError('Failed to load fabric details from API.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build an O(1) lookup: styleNumber -> fabricDetails. Avoids O(n*m) per render.
  const fabricByStyle = useMemo(() => {
    const map = new Map();
    for (const item of styleDetails) {
      if (item?.styleNumber != null) map.set(Number(item.styleNumber), item);
    }
    return map;
  }, [styleDetails]);

  const handlePrint = useCallback(() => window.print(), []);

  // Renders a single card element to a canvas.
  const captureCard = useCallback(async (el) => {
    return html2canvas(el, {
      scale: 2, // good balance of sharpness vs speed for a 90x50mm card
      backgroundColor: '#ffffff',
      useCORS: true, // needed since the QR image is fetched from an external URL
      logging: false,
      imageTimeout: 8000, // don't hang forever if the QR image is slow to load
    });
  }, []);

  // Captures every rendered .qr-card (in parallel batches) and drops each
  // one onto its own 90mm x 50mm PDF page, preserving the on-screen look.
  const handleExportPdf = useCallback(async () => {
    if (!cardsRef.current || exporting) return;

    const cardEls = Array.from(cardsRef.current.querySelectorAll('.qr-card'));
    const total = cardEls.length;
    if (!total) return;

    setExporting(true);
    setExportProgress({ current: 0, total });

    try {
      const PAGE_W = 100; // mm
      const PAGE_H = 50; // mm
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PAGE_W, PAGE_H] });

      // canvases[i] holds the rendered canvas for cardEls[i]. Workers fill
      // these in out of order (whichever finishes first), but we place them
      // into the PDF in the original order afterwards.
      const canvases = new Array(total);
      let nextIndex = 0;
      let done = 0;

      const worker = async () => {
        while (nextIndex < total) {
          const idx = nextIndex++;
          canvases[idx] = await captureCard(cardEls[idx]);
          done++;
          setExportProgress({ current: done, total });
        }
      };

      // Run several workers concurrently instead of one card at a time.
      await Promise.all(Array.from({ length: Math.min(EXPORT_CONCURRENCY, total) }, worker));

      // Assemble the PDF — just adding pre-rendered images now, so this is fast.
      canvases.forEach((canvas, i) => {
        if (i > 0) pdf.addPage([PAGE_W, PAGE_H], 'landscape');
        // Pass the canvas directly (skips the toDataURL base64 round trip).
        pdf.addImage(canvas, 'PNG', 0, 0, PAGE_W, PAGE_H);
      });

      pdf.save('qr-codes.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  }, [exporting, captureCard]);

  const hasProducts = products.length > 0;
  const progressPct =
    exportProgress.total > 0
      ? Math.round((exportProgress.current / exportProgress.total) * 100)
      : 0;

  return (
    <div className="max-w-[210mm] mx-auto">
      {/* Toolbar (hidden in print) */}
      <div className="no-print flex items-center justify-between mb-4 px-2">
        <h1 className="text-xl font-light text-gray-700">Generated QR Code Cards</h1>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload again
          </Link>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!hasProducts || loading || exporting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow transition-all"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!hasProducts || loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow transition-all"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* PDF export progress bar */}
      {exporting && (
        <div className="no-print mx-2 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">
              Generating PDF... ({exportProgress.current}/{exportProgress.total})
            </span>
            <span className="text-xs font-medium text-gray-600">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-200 ease-out rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Loader */}
      {loading && <div className="qr-loader no-print" />}

      <hr
        className="no-print my-6 mx-auto border-0 h-px"
        style={{
          width: '80%',
          background: 'linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.3), rgba(0,0,0,0))',
        }}
      />

      {/* Error / empty states */}
      {error && (
        <div className="no-print mx-auto mb-6 max-w-md flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!loading && !hasProducts && (
        <div className="no-print mx-auto max-w-md text-center py-12">
          <p className="text-red-500 font-bold font-mono">
            No products found. Please upload a CSV file first.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Upload className="w-4 h-4" />
            Go to Upload
          </Link>
        </div>
      )}

      {/* Cards grid (visible in print) */}
      {hasProducts && (
        <div id="cards" ref={cardsRef} className="qr-cards-grid">
          {products.map((product, idx) => {
            const styleNumber = Number(product['Style Number']);
            const fabricDetails = fabricByStyle.get(styleNumber);
            const key = product['(Do not touch) Order Id'] || `${styleNumber}-${idx}`;
            return <QrCard key={key} product={product} fabricDetails={fabricDetails} />;
          })}
        </div>
      )}
    </div>
  );
};

export default QrCodePage;
