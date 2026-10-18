const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vkhskdtgvlwlkmgzbpyl.supabase.co';
const supabaseKey = 'sb_publishable_oy_o0E4qYubDWuLpPc-15A_XQCIkO2B';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    // 임의의 쿼리를 보내 연결 응답을 확인
    const { data, error } = await supabase.from('proposals').select('count', { count: 'exact', head: true });
    console.log('Response error (if table doesn\'t exist yet):', error);
    console.log('Connection test completed successfully.');
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

testConnection();
