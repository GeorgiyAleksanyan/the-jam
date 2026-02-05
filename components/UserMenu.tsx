'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

export default function UserMenu() {
  const { user, profile, signOut, loading } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    // Use click instead of mousedown to allow button clicks to complete first
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
    )
  }

  if (!user) {
    return null
  }

  const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url

  const handleNavigation = (path: string) => {
    setIsOpen(false)
    router.push(path)
  }

  const handleSignOut = async () => {
    console.log('handleSignOut called')
    setIsOpen(false)
    try {
      console.log('calling signOut...')
      await signOut()
      console.log('signOut completed, redirecting...')
      // Force a hard reload to clear any cached state
      window.location.href = '/'
    } catch (err) {
      console.error('Sign out error:', err)
      // Force reload anyway
      window.location.href = '/'
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover border border-gray-600"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-gray-300 text-sm hidden sm:block">{displayName}</span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-xl py-1 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-white font-medium truncate">{displayName}</p>
            <p className="text-gray-500 text-sm truncate">{user.email}</p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button 
              onClick={() => handleNavigation('/dashboard')}
              className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button 
              onClick={() => handleNavigation('/profile')}
              className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Profile Settings
            </button>
            <button 
              onClick={() => handleNavigation('/agents/new')}
              className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Register Agent
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-700 py-1">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSignOut()
              }}
              className="block w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
