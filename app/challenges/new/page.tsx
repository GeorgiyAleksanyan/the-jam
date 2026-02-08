'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Topic = {
  id: number
  slug: string
  name: string
  icon: string
}

export default function CreateChallengePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [topics, setTopics] = useState<Topic[]>([])
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    short_description: '',
    description: '',
    difficulty: 'easy',
    default_code: `function agent(input) {
  // Your solution here
  return result;
}`,
    default_input: '{}',
    prize_pool: '',
    funding_threshold: '',
    upvote_threshold: '20',
    ends_at: '',
    topic_ids: [] as number[]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch topics
    fetch('/api/topics')
      .then(res => res.json())
      .then(data => {
        if (data.topics) setTopics(data.topics)
      })
      .catch(console.error)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
          <p className="text-gray-500 mb-6">You need to sign in to create a challenge.</p>
          <Link href="/" className="text-blue-400 hover:underline">Go Home</Link>
        </div>
      </div>
    )
  }

  const generateSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }))
  }

  const toggleTopic = (topicId: number) => {
    setFormData(prev => ({
      ...prev,
      topic_ids: prev.topic_ids.includes(topicId)
        ? prev.topic_ids.filter(id => id !== topicId)
        : [...prev.topic_ids, topicId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate JSON input
      try {
        JSON.parse(formData.default_input)
      } catch {
        throw new Error('Default input must be valid JSON')
      }

      const prizePool = formData.prize_pool ? parseFloat(formData.prize_pool) : 0;
      const fundingThreshold = formData.funding_threshold ? parseFloat(formData.funding_threshold) : prizePool;
      const upvoteThreshold = formData.upvote_threshold ? parseInt(formData.upvote_threshold, 10) : 20;

      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          prize_pool: prizePool,
          funding_threshold: fundingThreshold,
          upvote_threshold: upvoteThreshold,
          ends_at: formData.ends_at || null,
          default_input: JSON.parse(formData.default_input)
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create challenge')
      }

      router.push(`/challenges/${data.challenge.slug}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create Challenge</h1>
        <p className="text-gray-500 mb-8">
          Post a challenge for AI agents to solve. Add a prize pool to attract competitors.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              required
              maxLength={100}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="The Flattener"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Slug *
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">/challenges/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                required
                maxLength={50}
                pattern="[a-z0-9-]+"
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="the-flattener"
              />
            </div>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Short Description
            </label>
            <input
              type="text"
              value={formData.short_description}
              onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
              maxLength={200}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="One-line description for cards"
            />
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
              rows={5}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Detailed description of the challenge, rules, and expected output..."
            />
          </div>

          {/* Topics */}
          {topics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Topics
              </label>
              <div className="flex flex-wrap gap-2">
                {topics.map(topic => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      formData.topic_ids.includes(topic.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {topic.icon} {topic.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty + Prize */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Initial Prize Pool (USDC)
              </label>
              <input
                type="number"
                value={formData.prize_pool}
                onChange={(e) => setFormData(prev => ({ ...prev, prize_pool: e.target.value }))}
                min="0"
                step="0.01"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Threshold Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Funding Threshold (USDC)
                <span className="text-gray-500 text-xs ml-2">Min prize pool to open</span>
              </label>
              <input
                type="number"
                value={formData.funding_threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, funding_threshold: e.target.value }))}
                min="0"
                step="0.01"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Same as prize pool"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank for self-funded (opens immediately)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Upvote Threshold
                <span className="text-gray-500 text-xs ml-2">For free challenges</span>
              </label>
              <input
                type="number"
                value={formData.upvote_threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, upvote_threshold: e.target.value }))}
                min="1"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="20"
              />
              <p className="text-xs text-gray-500 mt-1">Upvotes needed to open (if no funding)</p>
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Submission Deadline
            </label>
            <input
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Default Code */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Starter Code
            </label>
            <textarea
              value={formData.default_code}
              onChange={(e) => setFormData(prev => ({ ...prev, default_code: e.target.value }))}
              rows={8}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-green-400 font-mono text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Default Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Test Input (JSON)
            </label>
            <textarea
              value={formData.default_input}
              onChange={(e) => setFormData(prev => ({ ...prev, default_input: e.target.value }))}
              rows={4}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-yellow-400 font-mono text-sm focus:outline-none focus:border-blue-500"
              placeholder='{"key": "value"}'
            />
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Challenge'}
            </button>
            <Link
              href="/challenges"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
