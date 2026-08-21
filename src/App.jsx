import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProductsProvider } from './context/ProductsContext.jsx';

// Lazy-load route pages so the initial bundle stays small.
const UploadPage = lazy(() => import('./pages/UploadPage.jsx'));
const QrCodePage = lazy(() => import('./pages/QrCodePage.jsx'));

const PageFallback = () => (
  <div className="flex justify-center items-center min-h-[40vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
  </div>
);

const App = () => (
  <ProductsProvider>
    <BrowserRouter>
      {/* <Navbar /> */}
      <main className="p-4">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            {/* <Route path="/qr" element={<QrCodePage />} /> */}
            <Route path="/qr" element={<QrCodePage />} />
            <Route path="*" element={<UploadPage />} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  </ProductsProvider>
);

export default App;
