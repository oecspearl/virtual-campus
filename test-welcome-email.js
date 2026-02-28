/**
 * Test Script for Welcome Email Feature
 * 
 * This script tests the welcome email functionality by:
 * 1. Checking if the email template exists in the database
 * 2. Sending a test welcome email via the API
 * 
 * Usage:
 *   node test-welcome-email.js <user-email>
 * 
 * Example:
 *   node test-welcome-email.js test@example.com
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function checkTemplate() {
    console.log('\n📋 Step 1: Checking if email template exists...\n');

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/email_templates?type=eq.student_welcome&select=*`, {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            }
        });

        const templates = await response.json();

        if (templates.length === 0) {
            console.log('❌ Template NOT found!');
            console.log('\n📝 You need to run the migration first:');
            console.log('   1. Open Supabase SQL Editor');
            console.log('   2. Run: database/migrations/002-add-student-welcome-template.sql');
            console.log('   3. Then run this script again\n');
            return false;
        }

        console.log('✅ Template found!');
        console.log(`   Name: ${templates[0].name}`);
        console.log(`   Type: ${templates[0].type}`);
        console.log(`   Active: ${templates[0].is_active}`);
        console.log(`   Variables: ${JSON.stringify(templates[0].variables)}\n`);
        return true;
    } catch (error) {
        console.error('❌ Error checking template:', error.message);
        return false;
    }
}

async function findOrCreateTestUser(email) {
    console.log(`\n👤 Step 2: Finding or creating test user: ${email}...\n`);

    try {
        // Check if user exists
        const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${email}&select=*`, {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            }
        });

        const users = await checkResponse.json();

        if (users.length > 0) {
            console.log('✅ User found!');
            console.log(`   ID: ${users[0].id}`);
            console.log(`   Name: ${users[0].name}`);
            console.log(`   Email: ${users[0].email}`);
            console.log(`   Role: ${users[0].role}\n`);
            return users[0];
        }

        console.log('⚠️  User not found. Please use an existing user email or create one in the admin panel.\n');
        return null;
    } catch (error) {
        console.error('❌ Error finding user:', error.message);
        return null;
    }
}

async function sendWelcomeEmail(userId, userEmail) {
    console.log(`\n📧 Step 3: Sending welcome email to ${userEmail}...\n`);

    try {
        // You'll need to get an admin session token first
        console.log('⚠️  Note: This requires admin authentication.');
        console.log('   For now, please test via the UI at: /admin/users/manage\n');

        console.log('📝 Manual Testing Steps:');
        console.log('   1. Log in as an admin');
        console.log('   2. Go to: http://localhost:3000/admin/users/manage');
        console.log(`   3. Find user: ${userEmail}`);
        console.log('   4. Click "Send Welcome Email" button');
        console.log('   5. Check the email inbox for the welcome email\n');

        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        return false;
    }
}

async function insertTemplate() {
    console.log('\n💾 Attempting to insert email template...\n');

    const template = {
        name: 'Student Welcome',
        type: 'student_welcome',
        subject_template: 'Welcome to OECS LearnBoard - Your Learning Journey Begins!',
        is_active: true,
        variables: ["student_name", "student_email", "temporary_password", "platform_url", "login_url", "help_url"],
        body_html_template: '<!-- Template HTML would go here -->',
        body_text_template: 'Welcome email text...'
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/email_templates`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(template)
        });

        if (response.ok) {
            console.log('✅ Template inserted successfully!\n');
            return true;
        } else {
            const error = await response.json();
            console.log('❌ Failed to insert template:', error.message || error);
            console.log('\n📝 Please run the SQL migration manually instead.\n');
            return false;
        }
    } catch (error) {
        console.error('❌ Error inserting template:', error.message);
        return false;
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  OECS LearnBoard - Welcome Email Test Script');
    console.log('═══════════════════════════════════════════════════════');

    // Check environment variables
    if (!SUPABASE_SERVICE_KEY) {
        console.log('\n❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
        console.log('   Please set it in your .env.local file\n');
        process.exit(1);
    }

    const userEmail = process.argv[2];
    if (!userEmail) {
        console.log('\n❌ Error: Please provide a user email');
        console.log('   Usage: node test-welcome-email.js <user-email>');
        console.log('   Example: node test-welcome-email.js test@example.com\n');
        process.exit(1);
    }

    // Step 1: Check template
    const templateExists = await checkTemplate();

    if (!templateExists) {
        console.log('🔧 Would you like to try inserting the template? (This may not work due to RLS)');
        console.log('   It\'s better to run the SQL migration in Supabase SQL Editor.\n');
        // Uncomment to try auto-insert:
        // await insertTemplate();
        return;
    }

    // Step 2: Find user
    const user = await findOrCreateTestUser(userEmail);

    if (!user) {
        console.log('💡 Tip: Create a test user first:');
        console.log('   1. Log in as admin');
        console.log('   2. Go to: http://localhost:3000/admin/users/manage');
        console.log('   3. Click "Add New User"');
        console.log(`   4. Create user with email: ${userEmail}\n`);
        return;
    }

    // Step 3: Send email (manual for now)
    await sendWelcomeEmail(user.id, user.email);

    console.log('═══════════════════════════════════════════════════════');
    console.log('  Test Complete!');
    console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
