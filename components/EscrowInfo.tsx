'use client'

import { useState, useEffect } from 'react'
import { ESCROW_ADDRESS, ACTIVE_CHAIN_ID } from '@/lib/escrow'

interface EscrowInfoProps {
  challengeId: number
}

interface EscrowData {
  pool: number
  totalFunded: number
  paid: boolean
  refunded: boolean
  feePercent: number
}

export function EscrowInfo({ challengeId }: EscrowInfoProps) {
  const [escrow, setEscrow] = useState<EscrowData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEscrow() {
      try {
        const res = await fetch(`/api/escrow/challenge/${challengeId}`)
        if (res.ok) {
          const data = await res.json()
          setEscrow(data.escrow)
        }
      } catch (err) {
        console.error('Failed to fetch escrow info:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchEscrow()
  }, [challengeId])

  if (loading) {
    return (
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-gray-700 rounded w-3/4"></div>
      </div>
    )
  }

  const explorerUrl = ACTIVE_CHAIN_ID === 8453 
    ? 'https://basescan.org' 
    : 'https://sepolia.basescan.org'

  return (
    <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <span className="text-lg">🔗</span> On-Chain Escrow
      </h3>
      
      <div className="space-y-3 text-sm">
        {/* Contract Link */}
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Contract</span>
          <a 
            href={`${explorerUrl}/address/${ESCROW_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline font-mono text-xs"
          >
            {ESCROW_ADDRESS.slice(0, 6)}...{ESCROW_ADDRESS.slice(-4)} ↗
          </a>
        </div>

        {/* Network */}
        <div className="flex justify-between">
          <span className="text-gray-500">Network</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            {ACTIVE_CHAIN_ID === 8453 ? 'Base' : 'Base Sepolia'}
          </span>
        </div>

        {escrow && (
          <>
            {/* Escrowed Amount */}
            <div className="flex justify-between">
              <span className="text-gray-500">Escrowed</span>
              <span className="text-green-400 font-semibold">
                ${escrow.pool.toFixed(2)} USDC
              </span>
            </div>

            {/* Total Funded */}
            <div className="flex justify-between">
              <span className="text-gray-500">Total Funded</span>
              <span>${escrow.totalFunded.toFixed(2)} USDC</span>
            </div>

            {/* Status */}
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={
                escrow.paid ? 'text-green-400' : 
                escrow.refunded ? 'text-yellow-400' : 
                escrow.pool > 0 ? 'text-blue-400' : 'text-gray-400'
              }>
                {escrow.paid ? '✓ Paid Out' : 
                 escrow.refunded ? '↩ Refunded' : 
                 escrow.pool > 0 ? '● Active' : '○ Empty'}
              </span>
            </div>

            {/* Platform Fee */}
            <div className="flex justify-between">
              <span className="text-gray-500">Platform Fee</span>
              <span>{escrow.feePercent}%</span>
            </div>
          </>
        )}

        {!escrow && (
          <div className="text-gray-500 text-center py-2">
            No escrow data yet
          </div>
        )}
      </div>

      {/* Transparency Note */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          💡 All funds are held in a transparent smart contract. 
          Winner receives 95%, 5% platform fee.
        </p>
      </div>
    </div>
  )
}
