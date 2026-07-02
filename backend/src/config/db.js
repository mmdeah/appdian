const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y/o SUPABASE_SERVICE_KEY')
  console.error('   Agrégalas en Railway → tu servicio → Variables')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: -1 },
  },
})

module.exports = supabase
