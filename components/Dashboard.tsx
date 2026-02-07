'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'

type Run = {
  id: number
  created_at: string
  status: string
  output?: string
  logs?: string
  execution_time_ms?: number
  challenge_id?: string
}

export default function Dashboard() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/runs')
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      
      const data = await res.json()
      if (data.runs) {
        setRuns(data.runs)
      }
    } catch (err: any) {
      console.error('Failed to fetch runs', err)
      setError('Failed to load runs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 5000)
    return () => clearInterval(interval)
  }, [fetchRuns])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-900 text-green-300'
      case 'failed':
      case 'error': return 'bg-red-900 text-red-300'
      case 'running': return 'bg-blue-900 text-blue-300'
      case 'timeout': return 'bg-orange-900 text-orange-300'
      default: return 'bg-yellow-900 text-yellow-300'
    }
  }

  if (loading && runs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-pulse">Loading fleet...</div>
      </div>
    )
  }

  // Don't show error - just show empty state if there's an issue
  if (runs.length === 0) {
    return null // Hide the entire section if no runs
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-5 h-5 inline" /> Fleet Status
        </h2>
        <span className="text-xs text-gray-500">
          {runs.length} runs • Auto-refresh
        </span>
      </div>
      
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-md overflow-hidden">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-gray-800 text-gray-200 uppercase font-medium text-xs">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-blue-400">#{run.id}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(run.status)}`}>
                    {run.status === 'running' && <span className="mr-1 animate-pulse">●</span>}
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {run.execution_time_ms ? `${run.execution_time_ms}ms` : '-'}
                </td>
                <td className="px-4 py-3 font-mono text-xs truncate max-w-[200px]" title={run.output || run.logs || ''}>
                  {run.output || run.logs || '-'}
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No runs yet. The Arena is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
