import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

const COLORS = ['#f5c542','#42c5f5','#c542f5','#f54266','#42f594','#f58c42','#f542c8','#82f542']

function colorFor(id) {
  let hash = 0
  const s = String(id)
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) & 0xffffff
  return COLORS[Math.abs(hash) % COLORS.length]
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Home() {
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')
  const [sort, setSort] = useState('newest')
  const [liked, setLiked] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('')
  const toastTimer = useRef(null)

  const showToast = (msg, type = 'ok') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts?sort=${sort}`)
      const data = await res.json()
      if (Array.isArray(data)) setPosts(data)
    } catch {
      showToast('failed to load posts', 'err')
    } finally {
      setLoading(false)
    }
  }, [sort])

  useEffect(() => {
    fetchPosts()
    const interval = setInterval(fetchPosts, 15000)
    return () => clearInterval(interval)
  }, [fetchPosts])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('bb_liked') || '[]')
      setLiked(new Set(stored))
    } catch {}
  }, [])

  const saveLiked = (newSet) => {
    setLiked(newSet)
    localStorage.setItem('bb_liked', JSON.stringify([...newSet]))
  }

  const submitPost = async () => {
    if (!text.trim() || posting) return
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const post = await res.json()
      if (!res.ok) throw new Error(post.error)
      setPosts(prev => [post, ...prev])
      setText('')
      showToast('posted anonymously ✓')
    } catch (e) {
      showToast(e.message || 'something went wrong', 'err')
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = async (post) => {
    const isLiked = liked.has(post.id)
    const action = isLiked ? 'unlike' : 'like'
    const newSet = new Set(liked)
    isLiked ? newSet.delete(post.id) : newSet.add(post.id)
    saveLiked(newSet)
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, likes: Math.max(0, (p.likes || 0) + (isLiked ? -1 : 1)) }
      : p
    ))
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
    } catch {}
  }

  const filtered = filter
    ? posts.filter(p => p.text.toLowerCase().includes(filter.toLowerCase()))
    : posts

  return (
    <>
      <Head>
        <title>Anonymous Billboard</title>
        <meta name="description" content="Say anything. Be nobody. Reach everyone." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📋</text></svg>" />
      </Head>

      <div className={styles.page}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <h1 className={styles.title}>ANONYMOUS<br/>BILLBOARD</h1>
            <p className={styles.subtitle}>say anything &bull; be nobody &bull; reach everyone</p>
          </div>
          <div className={styles.headerRule} />
        </header>

        <main className={styles.main}>
          {/* Compose */}
          <div className={styles.compose}>
            <div className={styles.composeInner}>
              <textarea
                className={styles.textarea}
                placeholder="what's on your mind? no names, no traces..."
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={500}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitPost()
                }}
              />
              <div className={styles.composeFooter}>
                <span className={`${styles.charCount} ${text.length > 420 ? styles.warn : ''}`}>
                  {text.length} / 500
                </span>
                <span className={styles.hint}>ctrl+enter to post</span>
                <button
                  className={styles.postBtn}
                  onClick={submitPost}
                  disabled={!text.trim() || posting || text.length > 500}
                >
                  {posting ? 'posting...' : 'post it'}
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <div className={styles.sortBtns}>
              {['newest','oldest','popular'].map(s => (
                <button
                  key={s}
                  className={`${styles.sortBtn} ${sort === s ? styles.sortActive : ''}`}
                  onClick={() => setSort(s)}
                >{s}</button>
              ))}
            </div>
            <input
              className={styles.searchInput}
              placeholder="search posts..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          <div className={styles.meta}>
            <span>{posts.length} post{posts.length !== 1 ? 's' : ''} on the board</span>
            {filter && <span className={styles.filterNote}>&bull; showing {filtered.length} results</span>}
          </div>

          {/* Posts grid */}
          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.pulse}>loading the board...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <p>{filter ? 'no posts match your search' : 'no posts yet — be the first voice'}</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map(post => {
                const color = colorFor(post.id)
                const isLiked = liked.has(post.id)
                return (
                  <div key={post.id} className={styles.card} style={{ borderLeftColor: color }}>
                    <p className={styles.cardText}>{post.text}</p>
                    <div className={styles.cardFooter}>
                      <span className={styles.cardTime}>{timeAgo(post.created_at)}</span>
                      <button
                        className={`${styles.likeBtn} ${isLiked ? styles.liked : ''}`}
                        onClick={() => toggleLike(post)}
                        style={isLiked ? { borderColor: color + '99', color: color } : {}}
                      >
                        ♥ {post.likes || 0}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        <footer className={styles.footer}>
          anonymous. no logs. no accounts. just words.
        </footer>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'err' ? styles.toastErr : ''}`}>
          {toast.msg}
        </div>
      )}
    </>
  )
}