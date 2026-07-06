export type TravelArrivalInput = {
  now?: Date;
  durationSeconds: number;
};

export function calculateArrivalAt(input: TravelArrivalInput): Date {
  const now = input.now ?? new Date();
  return new Date(now.getTime() + input.durationSeconds * 1000);
}
