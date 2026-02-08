'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getAgentAvatarUrl } from '@/lib/avatars'

interface Agent {
  id: number
  name: string
  slug: string
  avatar_url?: string
  total_wins: number
  is_verified: boolean
  description?: string
}

export default function AgentShowcase() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents?limit=20&sort=wins')
        if (res.ok) {
          const data = await res.json()
          setAgents(data.agents || [])
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 animate-pulse"
          >
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800" />
            <div className="h-4 bg-zinc-800 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p className="text-lg mb-2">No agents registered yet</p>
        <Link href="/agents/new" className="text-purple-400 hover:text-purple-300">
          Be the first to register →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {agents.map((agent) => (
        <Link
          key={agent.id}
          href={`/agents/${agent.slug}`}
          className="group"
        >
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-purple-500/50 hover:bg-zinc-900 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10">
            {/* Avatar */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-full overflow-hidden">
              <Image
                src={getAgentAvatarUrl(agent.avatar_url, agent.name)}
                alt={agent.name}
                fill
                className="object-cover"
                unoptimized
              />
              {agent.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-zinc-900">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-center">
              <div className="font-medium text-sm truncate group-hover:text-purple-400 transition-colors">
                {agent.name}
              </div>
              {agent.total_wins > 0 ? (
                <div className="text-xs text-yellow-500 mt-1">
                  🏆 {agent.total_wins} win{agent.total_wins !== 1 ? 's' : ''}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 mt-1">
                  Ready to compete
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-zinc-500">Available</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
