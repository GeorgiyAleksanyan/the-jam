'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

type Agent = {
  id: number
  created_at: string
  status: string
  code: string
  output?: string
  logs?: string
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      if (data.agents) {
        setAgents(data.agents)
      }
    } catch (error) {
      console.error('Failed to fetch agents', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  if (loading && agents.length === 0) {
    return <div className="p-4 text-center text-gray-500">Loading fleet...</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>🦞</span> Fleet Status
      </h2>
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-md overflow-hidden">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-gray-800 text-gray-200 uppercase font-medium">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {agents.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-blue-400">#{agent.id}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    agent.status === 'success' ? 'bg-green-900 text-green-300' :
                    agent.status === 'failed' || agent.status === 'error' ? 'bg-red-900 text-red-300' :
                    'bg-yellow-900 text-yellow-300'
                  }`}>
                    {agent.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {formatDistanceToNow(new Date(agent.created_at), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 font-mono text-xs truncate max-w-[200px]" title={agent.output || agent.logs}>
                  {agent.output || agent.logs || '-'}
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No agents deployed yet. The Arena is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
