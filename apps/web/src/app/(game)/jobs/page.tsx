import { and, eq } from 'drizzle-orm';
import { characterJobs, db, listActiveActionLocks } from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import { Card, EmptyState, GamePageShell, getActionCooldown, getActiveGameContext, Grid, money, StatList } from '@/features/game/game-page';

export default async function JobsPage() {
  const { character } = await getActiveGameContext();
  const [jobs, activeEmployment, actionLocks] = await Promise.all([
    db.query.jobDefinitions.findMany(),
    db.query.characterJobs.findFirst({
      where: and(eq(characterJobs.characterId, character.id), eq(characterJobs.status, 'active')),
    }),
    listActiveActionLocks(character.id),
  ]);

  const activeJob = activeEmployment
    ? jobs.find((job) => job.key === activeEmployment.jobKey)
    : null;
  const jobCooldown = getActionCooldown(actionLocks, 'job');

  return (
    <GamePageShell sidebarCharacter={character} title="Jobs" eyebrow={character.name} description="Apply for a legal job, work shifts for cash and XP, earn promotions, or resign before switching careers.">
      <Card title="Current employment">
        {activeEmployment && activeJob ? (
          <StatList items={[
            { label: 'Employer', value: activeJob.name },
            { label: 'Rank', value: activeEmployment.rank },
            { label: 'Shifts', value: activeEmployment.shiftsCompleted },
            { label: 'Total earned', value: money(activeEmployment.totalEarned) },
            { label: 'Status', value: activeEmployment.status },
          ]} />
        ) : <EmptyState>No active job. Apply for a job before working shifts.</EmptyState>}
      </Card>

      <div style={{ height: 16 }} />
      <p style={{ color: '#a1a1aa', marginTop: 0 }}>Available lifecycle actions: <code>apply</code>, <code>work</code>, and <code>resign</code>.</p>
      {jobs.length > 0 ? (
        <Grid>
          {jobs.map((job) => {
            const isActive = activeEmployment?.jobKey === job.key;
            return (
              <Card key={job.key} title={job.name} meta={isActive ? 'Current job' : `${job.durationSeconds}s cooldown`}>
                <p style={{ color: '#d4d4d8' }}>{job.description}</p>
                <StatList items={[
                  { label: 'Base wage', value: money(job.baseWage) },
                  { label: 'Energy', value: job.energyCost },
                  { label: 'Labour req.', value: job.requiredLabour },
                  { label: 'Intel req.', value: job.requiredIntelligence },
                ]} />
                {isActive ? (
                  <>
                    <GameActionForm endpoint="/api/jobs" label="Work shift" payload={{ characterId: character.id, jobKey: job.key, action: 'work' }} successMessage="Shift completed." cooldown={jobCooldown} />
                    <GameActionForm endpoint="/api/jobs" label="Resign" payload={{ characterId: character.id, jobKey: job.key, action: 'resign' }} successMessage="You resigned from this job." />
                  </>
                ) : (
                  <GameActionForm endpoint="/api/jobs" label="Apply" payload={{ characterId: character.id, jobKey: job.key, action: 'apply' }} successMessage="Application accepted." cooldown={jobCooldown} />
                )}
              </Card>
            );
          })}
        </Grid>
      ) : <Card><EmptyState>No jobs are configured yet.</EmptyState></Card>}
    </GamePageShell>
  );
}
