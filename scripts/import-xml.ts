#!/usr/bin/env npx tsx
/**
 * CLI script to import IMS Enterprise XML into the database.
 * Bypasses web server entirely — no proxy limits, no timeouts.
 *
 * Usage:
 *   npx tsx scripts/import-xml.ts <path-to-xml-file> [options]
 *
 * Examples:
 *   npx tsx scripts/import-xml.ts public/LMS_Moodle.xml
 *   npx tsx scripts/import-xml.ts public/LMS_Moodle.xml --no-users --auth=sso_passthrough
 *   npx tsx scripts/import-xml.ts public/LMS_Moodle.xml --publish --modality=blended
 *
 * Options:
 *   --no-users          Skip creating users
 *   --no-courses        Skip creating courses
 *   --no-enrollments    Skip creating enrollments
 *   --publish           Publish courses immediately
 *   --auth=TYPE         Auth flow: welcome_email (default) or sso_passthrough
 *   --modality=TYPE     Course modality: online (default), blended, or in_person
 *   --tenant=UUID       Tenant ID (defaults to primary tenant)
 */

import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// importIMSEnterpriseXML loaded dynamically in main() after env vars are set

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

function printUsage() {
  console.log(`
Usage: npx tsx scripts/import-xml.ts <path-to-xml-file> [options]

Options:
  --no-users          Skip creating users
  --no-courses        Skip creating courses
  --no-enrollments    Skip creating enrollments
  --publish           Publish courses immediately
  --auth=TYPE         Auth flow: welcome_email (default) or sso_passthrough
  --modality=TYPE     Course modality: online (default), blended, or in_person
  --tenant=UUID       Tenant ID (defaults to ${DEFAULT_TENANT_ID})
  --dry-run           Parse and validate XML without making changes (coming soon)
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  // Find the XML file path (first non-flag argument)
  const filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) {
    console.error('Error: No XML file path provided');
    printUsage();
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Parse flags
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const getFlag = (prefix: string) => {
    const flag = [...flags].find(f => f.startsWith(prefix + '='));
    return flag?.split('=')[1];
  };

  const options = {
    createUsers: !flags.has('--no-users'),
    createCourses: !flags.has('--no-courses'),
    createEnrollments: !flags.has('--no-enrollments'),
    publishCourses: flags.has('--publish'),
    authFlow: (getFlag('--auth') || 'welcome_email') as 'welcome_email' | 'sso_passthrough',
    defaultModality: getFlag('--modality') || 'online',
    defaultStudentRole: 'student',
    defaultInstructorRole: 'instructor',
    semester: '',
  };

  const tenantId = getFlag('--tenant') || DEFAULT_TENANT_ID;

  // Verify env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  // Read and validate the XML file
  console.log(`Reading ${resolvedPath}...`);
  const xmlContent = fs.readFileSync(resolvedPath, 'utf-8');
  console.log(`File size: ${(xmlContent.length / 1024 / 1024).toFixed(2)} MB`);

  if (!xmlContent.includes('<enterprise') && !xmlContent.includes('<Enterprise')) {
    console.error('Error: Invalid IMS Enterprise XML — missing <enterprise> element');
    process.exit(1);
  }

  // Print import settings
  console.log('\nImport settings:');
  console.log(`  Tenant ID:     ${tenantId}`);
  console.log(`  Create users:  ${options.createUsers}`);
  console.log(`  Create courses: ${options.createCourses}`);
  console.log(`  Create enrollments: ${options.createEnrollments}`);
  console.log(`  Publish courses: ${options.publishCourses}`);
  console.log(`  Auth flow:     ${options.authFlow}`);
  console.log(`  Modality:      ${options.defaultModality}`);
  console.log('');

  // Dynamic import so env vars are loaded first
  const { importIMSEnterpriseXML } = await import('../lib/sonisweb/xml-import');

  console.log('Starting import...\n');
  const startTime = Date.now();

  const result = await importIMSEnterpriseXML(xmlContent, tenantId, options);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Import ${result.status.toUpperCase()} (${elapsed}s) ===\n`);

  if (result.datasource) {
    console.log(`Datasource: ${result.datasource}`);
  }

  console.log(`Users:       ${result.persons_created} created, ${result.persons_skipped} skipped, ${result.persons_failed} failed (${result.persons_processed} total)`);
  console.log(`Courses:     ${result.courses_created} created, ${result.courses_skipped} skipped, ${result.courses_failed} failed (${result.groups_processed} total)`);
  console.log(`Enrollments: ${result.enrollments_created} enrolled, ${result.instructors_assigned} instructors, ${result.enrollments_skipped} skipped, ${result.enrollments_failed} failed (${result.memberships_processed} total)`);

  if (result.errors.length > 0) {
    console.log(`\n${result.errors.length} errors:`);
    result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  console.log('');
  process.exit(result.status === 'failed' ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
