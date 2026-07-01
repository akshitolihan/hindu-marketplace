// Formats a number as Indian Rupees.
export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    amount || 0
  );

// The price the buyer pays: sale price when a sale is active, else base price.
// Mirrors the server-side `effectivePrice` virtual.
export const effectivePrice = (product) => {
  const onSale =
    product?.salePrice != null &&
    product.salePrice < product.price &&
    (!product.saleEndsAt || new Date(product.saleEndsAt) > new Date());
  return onSale ? product.salePrice : product.price;
};

export const isOnSale = (product) =>
  product?.salePrice != null &&
  product.salePrice < product.price &&
  (!product.saleEndsAt || new Date(product.saleEndsAt) > new Date());
