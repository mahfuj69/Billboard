import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { sort = 'newest' } = req.query

    let query = supabase.from('posts').select('*')

    if (sort === 'newest') query = query.order('created_at', { ascending: false })
    else if (sort === 'oldest') query = query.order('created_at', { ascending: true })
    else if (sort === 'popular') query = query.order('likes', { ascending: false })

    query = query.limit(200)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { text } = req.body
    if (!text || text.trim().length === 0) return res.status(400).json({ error: 'Text required' })
    if (text.length > 500) return res.status(400).json({ error: 'Too long' })

    const { data, error } = await supabase
      .from('posts')
      .insert([{ text: text.trim(), likes: 0 }])
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  res.status(405).end()
}