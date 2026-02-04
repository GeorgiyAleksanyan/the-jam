// Check and apply MVP schema via Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function checkTables() {
  // Check if agent_runs exists
  const { data, error } = await supabase.from('agent_runs').select('id').limit(1)
  
  if (error && error.code === '42P01') {
    console.log('❌ agent_runs table does not exist')
    console.log('\n📋 Please run the following SQL in Supabase SQL Editor:')
    console.log('   File: supabase/schema_mvp.sql')
    console.log('\n   Or paste this URL in your browser:')
    console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.co/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql/new')}`)
    return false
  } else if (error) {
    console.log('⚠️  Error checking agent_runs:', error.message)
    return false
  } else {
    console.log('✅ agent_runs table exists')
    return true
  }
}

async function checkChallenges() {
  const { data, error } = await supabase.from('challenges').select('id').limit(1)
  
  if (error && error.code === '42P01') {
    console.log('❌ challenges table does not exist')
    return false
  } else if (error) {
    console.log('⚠️  Error checking challenges:', error.message)
    return false
  } else {
    console.log('✅ challenges table exists')
    return true
  }
}

async function main() {
  console.log('🔍 Checking Supabase schema...\n')
  
  const hasRuns = await checkTables()
  const hasChallenges = await checkChallenges()
  
  if (!hasRuns || !hasChallenges) {
    console.log('\n⚠️  Schema not fully applied.')
    console.log('\nTo fix, run schema_mvp.sql in Supabase SQL Editor.')
    const schemaPath = './supabase/schema_mvp.sql'
    if (fs.existsSync(schemaPath)) {
      console.log('\n--- Schema SQL ---')
      console.log(fs.readFileSync(schemaPath, 'utf8'))
    }
    process.exit(1)
  }
  
  console.log('\n✅ Schema OK!')
}

main().catch(console.error)
