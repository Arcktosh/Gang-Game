export type AssetTickInput = {
  currentPrice: number;
  volatility: number;
  drift: number;
  sentiment: number;
  volume: number;
};

export function calculateTradeFee(grossAmount: number, assetType: string): number {
  const rate = assetType === 'crypto' ? 0.015 : 0.01;
  return Math.max(1, Math.ceil(grossAmount * rate));
}

export function calculateNextAssetPrice(input: AssetTickInput): { price: number; sentiment: number; volume: number } {
  const volatility = Math.max(1, input.volatility);
  const previousSentiment = Math.max(-10, Math.min(10, input.sentiment));
  const randomSwing = Math.floor(Math.random() * (volatility * 2 + 1)) - volatility;
  const sentiment = Math.max(-10, Math.min(10, previousSentiment + randomSwing + input.drift));
  const movementPercent = input.drift + sentiment + randomSwing;
  const movement = Math.round(input.currentPrice * (movementPercent / 100));
  const price = Math.max(1, input.currentPrice + movement);
  const volume = Math.max(10, Math.floor(input.volume * (0.8 + Math.random() * 0.6)) + Math.abs(movement) * 5);

  return { price, sentiment, volume };
}

export function calculateAverageCost(input: { previousQuantity: number; previousAverageCost: number; buyQuantity: number; buyPriceEach: number }) {
  const totalQuantity = input.previousQuantity + input.buyQuantity;

  if (totalQuantity <= 0) {
    return 0;
  }

  const previousCost = input.previousQuantity * input.previousAverageCost;
  const newCost = input.buyQuantity * input.buyPriceEach;
  return Math.floor((previousCost + newCost) / totalQuantity);
}

export type BankTransferAction = 'deposit' | 'withdraw';

export type BankTransferInput = {
  cash: number;
  bank: number;
  amount: number;
  action: BankTransferAction;
};

export function normalizeBankTransferAmount(amount: number) {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, Math.floor(amount));
}

export function calculateBankTransfer(input: BankTransferInput) {
  const amount = normalizeBankTransferAmount(input.amount);
  const cash = Math.max(0, Math.floor(input.cash));
  const bank = Math.max(0, Math.floor(input.bank));

  if (input.action === 'deposit') {
    const appliedAmount = Math.min(cash, amount);

    return {
      action: input.action,
      requestedAmount: amount,
      appliedAmount,
      cashBefore: cash,
      bankBefore: bank,
      cashAfter: cash - appliedAmount,
      bankAfter: bank + appliedAmount,
      sufficientFunds: appliedAmount === amount && amount > 0,
    };
  }

  const appliedAmount = Math.min(bank, amount);

  return {
    action: input.action,
    requestedAmount: amount,
    appliedAmount,
    cashBefore: cash,
    bankBefore: bank,
    cashAfter: cash + appliedAmount,
    bankAfter: bank - appliedAmount,
    sufficientFunds: appliedAmount === amount && amount > 0,
  };
}
