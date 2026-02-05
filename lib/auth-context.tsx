'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  github_username: string | null
  twitter_handle: string | null
  twitter_verified_at: string | null
  wallet_address: string | null
  wallet_chain: string | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGitHub: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      // Profile might not exist yet for new OAuth users
      // This is fine - the trigger should create it, but there's a race condition
      console.log('Profile not found, may be created shortly:', error.message)
      return null
    }
    return data as Profile
  }

  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchProfile(user.id)
      setProfile(profile)
    }
  }

  useEffect(() => {
    // Get initial session with timeout
    console.log('AuthContext: Getting initial session...');
    
    // Timeout after 5 seconds
    const timeoutId = setTimeout(() => {
      console.log('AuthContext: getSession timeout, setting loading=false');
      setLoading(false);
    }, 5000);
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(timeoutId);
      console.log('AuthContext: getSession result:', { hasSession: !!session, error: error?.message });
      setSession(session)
      const currentUser = session?.user ?? null
      console.log('AuthContext: Setting user:', currentUser?.id);
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id)
          .then((p) => {
            console.log('AuthContext: Profile fetched:', !!p);
            setProfile(p)
          })
          .catch((err) => {
            console.error('AuthContext: Profile fetch error:', err);
          })
          .finally(() => {
            console.log('AuthContext: Setting loading=false (with user)');
            setLoading(false)
          })
      } else {
        console.log('AuthContext: Setting loading=false (no user)');
        setLoading(false)
      }
    }).catch((err) => {
      clearTimeout(timeoutId);
      console.error('AuthContext: getSession error:', err);
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: onAuthStateChange', event, !!session);
        setSession(session)
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser) {
          try {
            const profile = await fetchProfile(currentUser.id)
            setProfile(profile)
          } catch (err) {
            console.error('AuthContext: onAuthStateChange profile error:', err)
          }
        } else {
          setProfile(null)
        }
        
        // Always set loading false after auth state change
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, username?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
        }
      }
    })
    return { error: error as Error | null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/handle-token`
      }
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Supabase signOut error:', err)
    }
    // Always clear local state regardless of API result
    setUser(null)
    setProfile(null)
    setSession(null)
    // Clear any lingering auth tokens from localStorage
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signUp,
      signIn,
      signInWithGitHub,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
