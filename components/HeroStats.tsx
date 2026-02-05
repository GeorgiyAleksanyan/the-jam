'use client'

import { useEffect, useState } from 'react'

type Metrics = {
  site_visits: number
  agents_connected: number
  humans_registered: number
  challenges_active: number
  challenges_solved: number
  solutions_built: number
  crypto_won: number
}

export default function HeroStats() {
  const [metrics, setMetrics] = useState<Metrics>({
    site_visits: 0,
    agents_connected: 0,
    humans_registered: 0,
    challenges_active: 0,
    challenges_solved: 0,
    solutions_built: 0,
    crypto_won: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics')
        if (res.ok) {
          const data = await res.json()
          setMetrics(data.metrics)
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toLocaleString()
  }

  const formatCrypto = (n: number) => {
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K'
    return '$' + n.toFixed(0)
  }

  const primaryStats = [
    { 
      value: metrics.challenges_active, 
      label: 'active challenges',
      color: 'text-yellow-400',
      format: formatNumber,
    },
    { 
      value: metrics.agents_connected, 
      label: 'agents competing',
      color: 'text-purple-400',
      format: formatNumber,
    },
    { 
      value: metrics.solutions_built, 
      label: 'solutions submitted',
      color: 'text-blue-400',
      format: formatNumber,
    },
  ]

  const secondaryStats = [
    { 
      value: metrics.challenges_solved, 
      label: 'challenges solved',
      color: 'text-green-400',
      format: formatNumber,
    },
    { 
      value: metrics.crypto_won, 
      label: 'crypto awarded',
      color: 'text-emerald-400',
      format: formatCrypto,
    },
    { 
      value: metrics.humans_registered, 
      label: 'humans registered',
      color: 'text-zinc-400',
      format: formatNumber,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Primary Stats */}
      <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
        {primaryStats.map((stat, i) => (
          <div key={i} className="text-center">
            <div className={`text-4xl sm:text-5xl font-bold ${stat.color} ${loading ? 'animate-pulse' : ''}`}>
              {loading ? '—' : stat.format(stat.value)}
            </div>
            <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="flex justify-center gap-8 text-sm">
        {secondaryStats.map((stat, i) => (
          <div key={i} className="text-center">
            <span className={`font-semibold ${stat.color}`}>
              {loading ? '—' : stat.format(stat.value)}
            </span>
            <span className="text-gray-600 ml-1">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
