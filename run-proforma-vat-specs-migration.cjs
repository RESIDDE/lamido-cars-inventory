const { Client } = require('pg');

const passwords = ['#Samcuzzy39', '#Samcuzzy09099'];
const projectRefs = ['vuxssslfeqbgozeconvd', 'fxpkkrpnyecqlxbvekpb'];

const poolers = [
  'aws-0-eu-central-1.pooler.supabase.com',
  'aws-0-us-west-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-0-eu-west-2.pooler.supabase.com',
  'aws-0-eu-west-3.pooler.supabase.com',
  'aws-0-sa-east-1.pooler.supabase.com'
];

const SQL = `
ALTER TABLE public.performance_quotes
  ADD COLUMN IF NOT EXISTS vat_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0;

ALTER TABLE public.performance_quote_items
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS transmission text,
  ADD COLUMN IF NOT EXISTS cylinders text;
`;

async function run() {
  for (const projectRef of projectRefs) {
    for (const pw of passwords) {
      const encodedPw = encodeURIComponent(pw);
      const urls = [
        ...poolers.map(p => `postgresql://postgres.${projectRef}:${encodedPw}@${p}:6543/postgres?sslmode=require`),
        ...poolers.map(p => `postgresql://postgres.${projectRef}:${encodedPw}@${p}:5432/postgres?sslmode=require`),
        `postgresql://postgres:${encodedPw}@db.${projectRef}.supabase.co:5432/postgres`,
      ];

      for (const url of urls) {
        let client;
        try {
          client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
          await client.connect();
          console.log(`✅ Connected successfully via DB endpoint.`);

          console.log('Running VAT and vehicle specs SQL...');
          await client.query(SQL);
          console.log('✅ Migration applied successfully.');

          await client.end();
          console.log('🎉 ALL SQL MIGRATIONS COMPLETED SUCCESSFULLY!');
          process.exit(0);
        } catch (err) {
          if (client) await client.end().catch(() => {});
        }
      }
    }
  }
  console.error('❌ Failed to connect to any DB endpoint.');
  process.exit(1);
}

run();
