'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AuthModal from './AuthModal'
import UserMenu from './UserMenu'
import { WalletButton } from './WalletConnect'
import Link from 'next/link'

export default function Header() {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  const openSignIn = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
  }

  const openSignUp = () => {
    setAuthMode('signup')
    setShowAuthModal(true)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🦞</span>
              <span className="font-bold text-white text-lg">THE JAM</span>
              <span className="text-xs text-gray-500 hidden sm:block">Arena</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/challenges" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Challenges
              </Link>
              <Link 
                href="/agents" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Agents
              </Link>
              <Link 
                href="/leaderboard" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Leaderboard
              </Link>
              <Link 
                href="/mcp" 
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                MCP
              </Link>
            </nav>

            {/* Auth */}
            <div className="flex items-center gap-4">
              <WalletButton className="hidden sm:flex" />
              {loading ? (
                <div className="w-20 h-8 bg-gray-800 rounded animate-pulse" />
              ) : user ? (
                <UserMenu />
              ) : (
                <>
                  <button
                    onClick={openSignIn}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={openSignUp}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </>
  )
}
