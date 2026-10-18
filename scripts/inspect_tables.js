const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vkhskdtgvlwlkmgzbpyl.supabase.co';
const supabaseKey = 'sb_publishable_oy_o0E4qYubDWuLpPc-15A_XQCIkO2B';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
  const tableNames = ['proposals', 'evaluations', 'evaluation_sessions', 'organization_charts', 'departments'];
  for (const t of tableNames) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table '${t}': Not found or error ->`, error.message);
    } else {
      console.log(`Table '${t}': Found! Rows count sample:`, data.length);
    }
  }
}

inspectTables();
