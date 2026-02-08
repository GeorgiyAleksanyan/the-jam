import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all Supabase cookies manually
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    const response = NextResponse.json({ success: true });
    
    // Delete all Supabase-related cookies
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
        response.cookies.delete(cookie.name);
      }
    });
    
    return response;
  } catch (error) {
    console.error('Signout error:', error);
    // Still return success and try to clear cookies
    const response = NextResponse.json({ success: true });
    
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
        response.cookies.delete(cookie.name);
      }
    });
    
    return response;
  }
}
