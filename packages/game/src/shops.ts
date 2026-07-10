export type ShopSaleInput = {
  quantity: number;
  priceEach: number;
  sellerReputation: number;
};

export function calculateShopSale(input: ShopSaleInput) {
  const quantity = Math.max(1, Math.floor(input.quantity));
  const priceEach = Math.max(1, Math.floor(input.priceEach));
  const gross = quantity * priceEach;
  const platformFeeRate = Math.max(0.02, 0.08 - Math.min(0.04, Math.max(0, input.sellerReputation) / 2500));
  const platformFee = Math.ceil(gross * platformFeeRate);
  const sellerPayout = Math.max(0, gross - platformFee);

  return { quantity, priceEach, gross, platformFee, sellerPayout, platformFeeRate };
}

export function calculateShopListingLimit(reputation: number) {
  return 5 + Math.floor(Math.max(0, reputation) / 25);
}
