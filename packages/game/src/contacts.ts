export type ContactSpecialty =
  'muscle' | 'driver' | 'dealer' | 'lawyer' | 'medic' | 'hacker' | 'broker' | 'scout';
export type ContactAssignmentType =
  | 'job_assist'
  | 'crime_setup'
  | 'shop_shift'
  | 'territory_scout'
  | 'market_tip'
  | 'recovery_support';

export type ContactLike = {
  level: number;
  loyalty: number;
  specialty: ContactSpecialty;
  upkeep: number;
};

export function calculateRecruitCost(level: number, specialty: ContactSpecialty) {
  const premium =
    specialty === 'lawyer' || specialty === 'hacker' || specialty === 'broker' ? 175 : 100;
  return Math.max(150, 250 + level * 125 + premium);
}

export function calculateContactUpkeep(level: number, specialty: ContactSpecialty) {
  const modifier =
    specialty === 'lawyer' || specialty === 'hacker'
      ? 1.3
      : specialty === 'driver' || specialty === 'muscle'
        ? 1.15
        : 1;
  return Math.round((45 + level * 18) * modifier);
}

export function calculateContactPower(contact: ContactLike) {
  const specialtyBonus =
    contact.specialty === 'muscle' || contact.specialty === 'hacker'
      ? 8
      : contact.specialty === 'lawyer' || contact.specialty === 'broker'
        ? 6
        : 4;
  return Math.max(1, Math.round(contact.level * 10 + contact.loyalty * 0.45 + specialtyBonus));
}

export function calculateAssignmentDurationSeconds(
  assignmentType: ContactAssignmentType,
  contact: ContactLike,
) {
  const base: Record<ContactAssignmentType, number> = {
    job_assist: 1800,
    crime_setup: 2700,
    shop_shift: 3600,
    territory_scout: 2400,
    market_tip: 1800,
    recovery_support: 2100,
  };
  return Math.max(600, base[assignmentType] - contact.level * 45 - Math.floor(contact.loyalty / 2));
}

export function calculateAssignmentReward(
  assignmentType: ContactAssignmentType,
  contact: ContactLike,
) {
  const power = calculateContactPower(contact);
  const base: Record<ContactAssignmentType, number> = {
    job_assist: 80,
    crime_setup: 120,
    shop_shift: 100,
    territory_scout: 90,
    market_tip: 75,
    recovery_support: 70,
  };
  return Math.round(base[assignmentType] + power * 6);
}

export function calculateAssignmentRisk(
  assignmentType: ContactAssignmentType,
  contact: ContactLike,
) {
  const base: Record<ContactAssignmentType, number> = {
    job_assist: 5,
    crime_setup: 30,
    shop_shift: 8,
    territory_scout: 22,
    market_tip: 10,
    recovery_support: 6,
  };
  return Math.max(1, base[assignmentType] - contact.level - Math.floor(contact.loyalty / 15));
}

export function canAssignContact(contact: { status: string; loyalty: number }) {
  if (contact.status !== 'idle') {
    return { ok: false as const, message: 'Contact is already busy.' };
  }
  if (contact.loyalty <= 0) {
    return { ok: false as const, message: 'Contact loyalty is too low.' };
  }
  return { ok: true as const };
}

export function calculateAssignmentOutcome(contact: ContactLike, riskScore: number) {
  const power = calculateContactPower(contact);
  const successScore = power + Math.floor(contact.loyalty / 2);
  const threshold = riskScore + 35;
  const success = successScore >= threshold || successScore + contact.level * 3 > riskScore * 1.6;
  const loyaltyDelta = success ? 2 : -Math.max(2, Math.floor(riskScore / 10));
  const experienceGain = success
    ? Math.max(5, Math.floor(riskScore / 2) + contact.level * 2)
    : Math.max(1, Math.floor(riskScore / 5));
  return { success, loyaltyDelta, experienceGain };
}

export function calculateContactLevelFromExperience(currentLevel: number, experience: number) {
  let level = currentLevel;
  while (experience >= level * 100 && level < 20) {
    level += 1;
  }
  return level;
}
