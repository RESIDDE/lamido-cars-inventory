import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

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

async function run() {
  const sql1 = fs.readFileSync(path.resolve('supabase/migrations/20260903000002_performance_quotes_save.sql'), 'utf8');
  const sql2 = fs.readFileSync(path.resolve('supabase/migrations/20260903000004_company_expenses.sql'), 'utf8');

  for (const projectRef of projectRefs) {
    for (const pw of passwords) {
      const encodedPw = encodeURIComponent(pw);
      const urls = [
        `postgresql://postgres:${encodedPw}@db.${projectRef}.supabase.co:5432/postgres`,
        `postgresql://postgres.${projectRef}:${encodedPw}@db.${projectRef}.supabase.co:5432/postgres`,
        ...poolers.map(p => `postgresql://postgres.${projectRef}:${encodedPw}@${p}:6543/postgres?sslmode=require`),
        ...poolers.map(p => `postgresql://postgres.${projectRef}:${encodedPw}@${p}:5432/postgres?sslmode=require`),
      ];

      for (const url of urls) {
        let client;
        try {
          client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
          await client.connect();
          console.log(`✅ Connected successfully via: ${url.replace(encodedPw, '***')}`);

          console.log('Running Proforma Quotes SQL...');
          await client.query(sql1);
          console.log('✅ Proforma Quotes SQL applied successfully.');

          console.log('Running Company Expenses SQL...');
          await client.query(sql2);
          console.log('✅ Company Expenses SQL applied successfully.');

          await client.end();
          console.log('🎉 ALL SQL MIGRATIONS COMPLETED SUCCESSFULLY!');
          process.exit(0);
        } catch (err) {
          if (client) await client.end().catch(() => {});
        }
      }
    }
  }
  console.log('Could not connect via direct postgres connection string.');
}

run();
