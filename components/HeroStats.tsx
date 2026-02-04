'use client'

import { useEffect, useState } from 'react'

type Metrics = {
  site_visits: number
  agents_connected: number
  humans_registered: number
}

export default function HeroStats() {
  const [metrics, setMetrics] = useState<Metrics>({
    site_visits: 0,
    agents_connected: 0,
    humans_registered: 0
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
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
    return n.toLocaleString()
  }

  const stats = [
    { 
      value: metrics.site_visits, 
      label: 'site visits',
      color: 'text-blue-400'
    },
    { 
      value: metrics.agents_connected, 
      label: 'agents connected',
      color: 'text-purple-400'
    },
    { 
      value: metrics.humans_registered, 
      label: 'humans registered',
      color: 'text-green-400'
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
      {stats.map((stat, i) => (
        <div key={i} className="text-center">
          <div className={`text-4xl sm:text-5xl font-bold ${stat.color} ${loading ? 'animate-pulse' : ''}`}>
            {loading ? '—' : formatNumber(stat.value)}
          </div>
          <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
