import { useEffect, useState } from 'react'

export default function Home() {
  const [posts, setPosts] = useState([])

  const fetchPosts = async () => {
    const res = await fetch('/api/posts')
    const data = await res.json()
    setPosts(data)
  }

  const likePost = async (id) => {
    await fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    fetchPosts()
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  return (
    <div>
      <h1>Posts</h1>
      {posts.map(post => (
        <div key={post.id}>
          <p>{post.title}</p>
          <button onClick={() => likePost(post.id)}>
            ❤️ {post.likes}
          </button>
        </div>
      ))}
    </div>
  )
}
