import postgres from 'postgres';

const proofDatabaseUrl = process.env.MVP_PROOF_DATABASE_URL;

if (!proofDatabaseUrl) {
  console.error('MVP_PROOF_DATABASE_URL is required to prepare the proof database.');
  process.exit(1);
}

function getDatabaseName(connectionString: string) {
  const url = new URL(connectionString);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!databaseName) {
    throw new Error('MVP_PROOF_DATABASE_URL must include a database name.');
  }

  if (databaseName === 'postgres' || databaseName === 'template0' || databaseName === 'template1') {
    throw new Error(`Refusing to reset reserved Postgres database: ${databaseName}`);
  }

  return databaseName;
}

function getMaintenanceConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  url.pathname = '/postgres';
  return url.toString();
}

function quoteIdentifier(identifier: string) {
  return `\"${identifier.replace(/\"/g, '\"\"')}\"`;
}

const proofDatabaseName = getDatabaseName(proofDatabaseUrl);
const maintenanceConnectionString = getMaintenanceConnectionString(proofDatabaseUrl);
const sql = postgres(maintenanceConnectionString, { max: 1 });

try {
  await sql`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = ${proofDatabaseName}
      AND pid <> pg_backend_pid()
  `;
  const quotedDatabaseName = quoteIdentifier(proofDatabaseName);
  await sql.unsafe(`DROP DATABASE IF EXISTS ${quotedDatabaseName}`);
  await sql.unsafe(`CREATE DATABASE ${quotedDatabaseName}`);
  console.log(`Prepared clean MVP proof database: ${proofDatabaseName}`);
} finally {
  await sql.end();
}
