import { db, listActiveActionLocks } from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import { Card, EmptyState, GamePageShell, getActionCooldown, getActiveGameContext, Grid, money, StatList } from '@/features/game/game-page';

export default async function CrimesPage() {
  const { character } = await getActiveGameContext();
  const [crimes, actionLocks] = await Promise.all([
    db.query.crimeDefinitions.findMany(),
    listActiveActionLocks(character.id),
  ]);
  const availableCrimes = crimes.filter((crime) => character.level >= crime.requiredLevel);

  return (
    <GamePageShell sidebarCharacter={character} title="Crimes" eyebrow={character.name} description="Attempt abstract fictional crimes, balancing reward against heat, jail, and hospital consequences.">
      {availableCrimes.length > 0 ? (
        <Grid>
          {availableCrimes.map((crime) => (
            <Card key={crime.key} title={crime.name} meta={`Difficulty ${crime.difficulty}`}>
              <p style={{ color: '#d4d4d8' }}>{crime.description}</p>
              <StatList items={[
                { label: 'Level req.', value: crime.requiredLevel },
                { label: 'Nerve', value: crime.requiredNerve },
                { label: 'Reward', value: `${money(crime.minReward)} - ${money(crime.maxReward)}` },
                { label: 'Heat', value: `+${crime.heatGain}` },
                { label: 'Jail risk', value: `${crime.jailRisk}%` },
                { label: 'Cooldown', value: `${crime.cooldownSeconds}s` },
              ]} />
              <GameActionForm endpoint="/api/crimes" label="Attempt crime" payload={{ characterId: character.id, crimeKey: crime.key }} successMessage="Crime attempt resolved." cooldown={getActionCooldown(actionLocks, 'crime')} />
            </Card>
          ))}
        </Grid>
      ) : <Card><EmptyState>No crimes are available at your current level. Level-gated actions stay hidden until unlocked.</EmptyState></Card>}
    </GamePageShell>
  );
}
