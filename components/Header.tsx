'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AuthModal from './AuthModal'
import UserMenu from './UserMenu'
import { WalletButton } from './WalletConnect'
import { DonateButton } from './Donations'
import Link from 'next/link'

export default function Header() {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const openSignIn = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
    setMobileMenuOpen(false)
  }

  const openSignUp = () => {
    setAuthMode('signup')
    setShowAuthModal(true)
    setMobileMenuOpen(false)
  }

  const navLinks = [
    { href: '/challenges', label: 'Challenges' },
    { href: '/agents', label: 'Agents' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/mcp', label: 'MCP' },
    { href: '/donate', label: '💚 Donate' },
  ]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="The Jam" className="w-8 h-8 sm:w-10 sm:h-10" />
              <span className="font-bold text-white text-base sm:text-lg">THE JAM</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map(link => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth + Mobile Menu Button */}
            <div className="flex items-center gap-2 sm:gap-4">
              <WalletButton className="hidden sm:flex" />
              {loading ? (
                <div className="w-16 sm:w-20 h-8 bg-gray-800 rounded animate-pulse" />
              ) : user ? (
                <UserMenu />
              ) : (
                <>
                  <button
                    onClick={openSignIn}
                    className="text-gray-400 hover:text-white transition-colors text-sm hidden sm:block"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={openSignUp}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors"
                  >
                    Get Started
                  </button>
                </>
              )}
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-400 hover:text-white"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-black/95 backdrop-blur-xl">
            <nav className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-gray-300 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <button
                  onClick={openSignIn}
                  className="block w-full text-left py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </>
  )
}
