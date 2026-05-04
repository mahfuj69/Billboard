import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'POST') {
    const { action } = req.body // 'like' or 'unlike'

    const { data: post } = await supabase
      .from('posts')
      .select('likes')
      .eq('id', id)
      .single()

    if (!post) return res.status(404).json({ error: 'Not found' })

    const newLikes = action === 'unlike'
      ? Math.max(0, (post.likes || 0) - 1)
      : (post.likes || 0) + 1

    const { data, error } = await supabase
      .from('posts')
      .update({ likes: newLikes })
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  res.status(405).end()
}