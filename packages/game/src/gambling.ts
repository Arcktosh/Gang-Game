export type GamblingGameKey = 'slots' | 'dice-low' | 'dice-high' | 'blackjack-lite';

export type GamblingOutcome = {
  outcome: 'win' | 'loss' | 'push';
  payoutMultiplier: number;
  payout: number;
  profit: number;
  roll: number;
  label: string;
};

export function calculateGamblingCooldownSeconds(wager: number) {
  return Math.max(5, Math.min(90, Math.ceil(wager / 50) * 5));
}

export function calculateTableLimit(input: {
  level: number;
  gamblingReputation: number;
  cash: number;
}) {
  const reputationBonus = Math.max(0, input.gamblingReputation) * 25;
  const levelBonus = Math.max(1, input.level) * 100;
  const liquidityLimit = Math.max(25, Math.floor(input.cash * 0.5));
  return Math.max(25, Math.min(25_000, levelBonus + reputationBonus, liquidityLimit));
}

export function resolveGamblingWager(input: {
  gameKey: string;
  wager: number;
  houseEdgeBasisPoints: number;
  variance: number;
  luckyRoll?: number;
}): GamblingOutcome {
  const wager = Math.max(1, Math.floor(input.wager));
  const roll = input.luckyRoll ?? Math.floor(Math.random() * 10_000) + 1;
  const houseEdge = Math.max(0, Math.min(2500, input.houseEdgeBasisPoints));

  if (input.gameKey === 'slots') {
    if (roll >= 9900) {
      return {
        outcome: 'win',
        payoutMultiplier: 12,
        payout: wager * 12,
        profit: wager * 11,
        roll,
        label: 'Jackpot spin',
      };
    }
    if (roll >= 9400) {
      return {
        outcome: 'win',
        payoutMultiplier: 4,
        payout: wager * 4,
        profit: wager * 3,
        roll,
        label: 'Triple match',
      };
    }
    if (roll >= 8200 + houseEdge) {
      return {
        outcome: 'win',
        payoutMultiplier: 2,
        payout: wager * 2,
        profit: wager,
        roll,
        label: 'Small match',
      };
    }
    return {
      outcome: 'loss',
      payoutMultiplier: 0,
      payout: 0,
      profit: -wager,
      roll,
      label: 'No match',
    };
  }

  if (input.gameKey === 'dice-low' || input.gameKey === 'dice-high') {
    const threshold =
      input.gameKey === 'dice-low'
        ? 4700 - Math.floor(houseEdge / 2)
        : 5300 + Math.floor(houseEdge / 2);
    const won = input.gameKey === 'dice-low' ? roll <= threshold : roll >= threshold;
    if (won) {
      return {
        outcome: 'win',
        payoutMultiplier: 2,
        payout: wager * 2,
        profit: wager,
        roll,
        label: input.gameKey === 'dice-low' ? 'Rolled low' : 'Rolled high',
      };
    }
    return {
      outcome: 'loss',
      payoutMultiplier: 0,
      payout: 0,
      profit: -wager,
      roll,
      label: input.gameKey === 'dice-low' ? 'Too high' : 'Too low',
    };
  }

  if (input.gameKey === 'blackjack-lite') {
    if (roll >= 9750) {
      return {
        outcome: 'win',
        payoutMultiplier: 3,
        payout: wager * 3,
        profit: wager * 2,
        roll,
        label: 'Blackjack',
      };
    }
    if (roll >= 5450 + houseEdge) {
      return {
        outcome: 'win',
        payoutMultiplier: 2,
        payout: wager * 2,
        profit: wager,
        roll,
        label: 'Dealer bust',
      };
    }
    if (roll >= 5050 + houseEdge) {
      return {
        outcome: 'push',
        payoutMultiplier: 1,
        payout: wager,
        profit: 0,
        roll,
        label: 'Push',
      };
    }
    return {
      outcome: 'loss',
      payoutMultiplier: 0,
      payout: 0,
      profit: -wager,
      roll,
      label: 'Player bust',
    };
  }

  return {
    outcome: 'loss',
    payoutMultiplier: 0,
    payout: 0,
    profit: -wager,
    roll,
    label: 'Invalid game',
  };
}
