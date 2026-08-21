import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "products";

const ProductsContext = createContext(null);

const readFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to read products from localStorage:", err);
    return [];
  }
};

const writeToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to write products to localStorage:", err);
  }
};

export const ProductsProvider = ({ children }) => {
  // Hydrate from localStorage on first render so refresh keeps data.
  const [products, setProductsState] = useState(readFromStorage);

  // Mirror state -> localStorage automatically.
  useEffect(() => {
    writeToStorage(products);
  }, [products]);

  const setProducts = useCallback((next) => {
    setProductsState(Array.isArray(next) ? next : []);
  }, []);

  const clearProducts = useCallback(() => {
    setProductsState([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Failed to clear products:", err);
    }
  }, []);

  const value = useMemo(
    () => ({ products, setProducts, clearProducts }),
    [products, setProducts, clearProducts]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error("useProducts must be used inside <ProductsProvider>");
  }
  return ctx;
};
