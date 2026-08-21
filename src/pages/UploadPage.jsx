import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Download,
  FileText,
  Loader2,
} from 'lucide-react';
import { useProducts } from '../context/ProductsContext.jsx';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

const STATUS_STYLES = {
  success: 'bg-green-50 text-green-700 border-green-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

const UploadPage = () => {
  const navigate = useNavigate();
  const { products, setProducts, clearProducts } = useProducts();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success'|'error'|'info', message }
  const [parsing, setParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const showStatus = useCallback((type, message) => {
    setStatus({ type, message });
  }, []);

  const resetFile = useCallback(() => {
    setFileName('');
    setStatus(null);
    setParsing(false);
    clearProducts();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [clearProducts]);

  const parseFile = useCallback(
    (file) => {
      if (!file) return;

      // Validation
      if (!file.name.toLowerCase().endsWith('.csv')) {
        showStatus('error', 'Please upload a valid CSV file.');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        showStatus('error', 'File size exceeds 5MB limit.');
        return;
      }

      setFileName(file.name);
      setParsing(true);
      showStatus('info', 'Processing file...');

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setParsing(false);

          if (!results.data?.length) {
            showStatus('error', 'CSV file is empty.');
            return;
          }
          if (Object.keys(results.data[0] ?? {}).length < 1) {
            showStatus('error', 'CSV format is invalid.');
            return;
          }

          setProducts(results.data);
          showStatus(
            'success',
            `Successfully loaded ${results.data.length} record${
              results.data.length === 1 ? '' : 's'
            }.`
          );
        },
        error: (err) => {
          setParsing(false);
          console.error('CSV parse error:', err);
          showStatus('error', 'Error parsing CSV file.');
        },
      });
    },
    [setProducts, showStatus]
  );

  const handleFileChange = useCallback((e) => parseFile(e.target.files?.[0]), [parseFile]);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      parseFile(e.dataTransfer.files?.[0]);
    },
    [parseFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleGenerate = useCallback(() => {
    if (!products.length) return;
    navigate('/qr');
  }, [navigate, products.length]);

  const canGenerate = products.length > 0 && !parsing;

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[Poppins] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 transition-shadow hover:shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
              <CloudUpload className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              CSV to QR Generator
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              Upload your product data CSV to generate QR codes in bulk
            </p>
          </div>

          {/* Template download */}
          <div className="text-center mb-6">
            <a
              href="/QrCode.csv"
              download
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Template
            </a>
          </div>

          {/* Drop zone */}
          <label
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
            } ${parsing ? 'opacity-60 cursor-wait' : ''}`}
          >
            <CloudUpload className="w-10 h-10 mx-auto text-blue-500 mb-2" />
            <p className="text-sm font-semibold text-blue-600 mb-1">Select CSV File</p>
            <p className="text-xs text-gray-500">or drag and drop your file here</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={parsing}
              className="hidden"
            />
          </label>

          {/* Selected file */}
          {fileName && (
            <div className="mt-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-sm font-medium text-blue-800 truncate">{fileName}</span>
              </div>
              {!parsing && (
                <button
                  type="button"
                  onClick={resetFile}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Status message */}
          {status && (
            <div
              className={`mt-4 flex items-start gap-2 px-4 py-3 rounded-lg border text-sm ${
                STATUS_STYLES[status.type] ?? STATUS_STYLES.info
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : status.type === 'error' ? (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
              )}
              <span className="flex-1">{status.message}</span>
            </div>
          )}

          {/* Generate button */}
          {canGenerate && (
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Generate QR Codes
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Supports CSV files with headers. Max file size: 5MB
        </p>
      </div>
    </div>
  );
};

export default UploadPage;
