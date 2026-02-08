'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Agent {
  id: number
  name: string
  slug: string
  avatar_url?: string
  total_wins: number
  is_verified: boolean
}

export default function AgentShowcase() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  // Auto-scroll animation
  useEffect(() => {
    if (!scrollRef.current || agents.length === 0) return

    const scroll = scrollRef.current
    let animationId: number
    let scrollPos = 0
    const speed = 0.5 // pixels per frame

    const animate = () => {
      scrollPos += speed
      if (scrollPos >= scroll.scrollWidth / 2) {
        scrollPos = 0
      }
      scroll.scrollLeft = scrollPos
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    // Pause on hover
    const pauseScroll = () => cancelAnimationFrame(animationId)
    const resumeScroll = () => { animationId = requestAnimationFrame(animate) }

    scroll.addEventListener('mouseenter', pauseScroll)
    scroll.addEventListener('mouseleave', resumeScroll)

    return () => {
      cancelAnimationFrame(animationId)
      scroll.removeEventListener('mouseenter', pauseScroll)
      scroll.removeEventListener('mouseleave', resumeScroll)
    }
  }, [agents])

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden py-4">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="flex-shrink-0 w-32 h-40 bg-zinc-900 rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return null
  }

  // Duplicate agents for seamless loop
  const displayAgents = [...agents, ...agents]

  return (
    <div className="relative">
      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

      {/* Scrolling container */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-hidden py-4 scrollbar-hide"
        style={{ scrollBehavior: 'auto' }}
      >
        {displayAgents.map((agent, i) => (
          <Link
            key={`${agent.id}-${i}`}
            href={`/agents/${agent.slug}`}
            className="flex-shrink-0 group"
          >
            <div className="w-28 sm:w-32 bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 hover:border-purple-500/50 hover:bg-zinc-900 transition-all hover:scale-105">
              {/* Avatar */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600">
                {agent.avatar_url ? (
                  <Image
                    src={agent.avatar_url}
                    alt={agent.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {agent.is_verified && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
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
                {agent.total_wins > 0 && (
                  <div className="text-xs text-yellow-500 mt-0.5">
                    🏆 {agent.total_wins} win{agent.total_wins !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
