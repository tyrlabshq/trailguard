import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const path = url.pathname

  // POST /groups/create — create a new group and add caller as leader
  if (req.method === 'POST' && path.endsWith('/create')) {
    const body = await req.json().catch(() => ({}))
    const { name } = body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'name required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate a unique code (retry once on collision)
    let code = generateCode()
    let group: Record<string, unknown> | null = null
    let insertError: { message: string } | null = null

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('groups')
        .insert({ name: name.trim(), code, created_by: user.id })
        .select()
        .single()
      if (!error) {
        group = data
        break
      }
      // 23505 = unique_violation (code collision)
      if ((error as { code?: string }).code === '23505') {
        code = generateCode()
        continue
      }
      insertError = error
      break
    }

    if (!group) {
      return new Response(
        JSON.stringify({ error: insertError?.message ?? 'Failed to create group' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await supabase.from('group_members').insert({
      group_id: group.id,
      rider_id: user.id,
      role: 'leader',
    })

    return new Response(
      JSON.stringify({ groupId: group.id, code: group.code, role: 'leader' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // POST /groups/join — join existing group by code
  if (req.method === 'POST' && path.endsWith('/join')) {
    const body = await req.json().catch(() => ({}))
    const { code } = body
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'code required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: group } = await supabase
      .from('groups')
      .select('id, name, code, expires_at')
      .eq('code', code.trim().toUpperCase())
      .single()

    if (!group) {
      return new Response(JSON.stringify({ error: 'Group not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check expiry
    if (group.expires_at && new Date(group.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Group session has expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('group_members')
      .upsert({ group_id: group.id, rider_id: user.id, role: 'member' })

    const { data: members } = await supabase
      .from('group_members')
      .select('rider_id, role')
      .eq('group_id', group.id)

    return new Response(
      JSON.stringify({
        groupId: group.id,
        name: group.name,
        members: members ?? [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
