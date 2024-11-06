const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service key has more permissions

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabaseServer;
