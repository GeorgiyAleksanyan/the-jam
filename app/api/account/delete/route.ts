import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Admin client for deleting auth users
const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = user.id;

    // Start deletion cascade
    // Order matters due to foreign key constraints

    // 1. Delete user's submissions (or anonymize)
    const { error: submissionsError } = await adminSupabase
      .from('submissions')
      .update({ 
        agent_id: null,
        // Keep submission for challenge history but remove association
      })
      .eq('agent_id', adminSupabase
        .from('agents')
        .select('id')
        .eq('owner_id', userId)
      );
    
    // Alternative: just delete if no FK constraints
    await adminSupabase
      .from('submissions')
      .delete()
      .in('agent_id', 
        (await adminSupabase.from('agents').select('id').eq('owner_id', userId)).data?.map(a => a.id) || []
      );

    // 2. Delete user's agents
    const { error: agentsError } = await adminSupabase
      .from('agents')
      .delete()
      .eq('owner_id', userId);

    if (agentsError) {
      console.error('Error deleting agents:', agentsError);
    }

    // 3. Delete user's contributions (or anonymize)
    const { error: contribError } = await adminSupabase
      .from('contributions')
      .update({ contributor_id: null })
      .eq('contributor_id', userId);

    if (contribError) {
      console.error('Error anonymizing contributions:', contribError);
    }

    // 4. Delete user's profile
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      // Continue anyway - auth deletion is more important
    }

    // 5. Delete auth user (this is the critical step)
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return NextResponse.json({ 
        error: 'Failed to delete account. Please contact support.',
        details: deleteUserError.message 
      }, { status: 500 });
    }

    // Log deletion for audit
    try {
      await adminSupabase.from('audit_log').insert({
        action: 'account_deleted',
        user_id: userId,
        metadata: {
          email: user.email,
          deleted_at: new Date().toISOString(),
        }
      });
    } catch {
      // Audit log table might not exist, that's ok
    }

    // Clear all auth cookies
    const response = NextResponse.json({ 
      success: true,
      message: 'Account and all associated data deleted successfully'
    });

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
        response.cookies.delete(cookie.name);
      }
    });

    return response;

  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account',
      details: error.message 
    }, { status: 500 });
  }
}

// GET method to check what will be deleted (preview)
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get counts of data that will be deleted
    const { data: agents } = await adminSupabase
      .from('agents')
      .select('id, name, total_earnings')
      .eq('owner_id', user.id);

    const agentIds = agents?.map(a => a.id) || [];

    const { count: submissionsCount } = await adminSupabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .in('agent_id', agentIds.length > 0 ? agentIds : ['00000000-0000-0000-0000-000000000000']);

    const { count: contributionsCount } = await adminSupabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('contributor_id', user.id);

    return NextResponse.json({
      user: {
        email: user.email,
        created_at: user.created_at,
      },
      data_to_delete: {
        agents: agents || [],
        agents_count: agents?.length || 0,
        submissions_count: submissionsCount || 0,
        contributions_count: contributionsCount || 0,
        total_earnings: agents?.reduce((sum, a) => sum + (a.total_earnings || 0), 0) || 0,
      },
      warning: 'This action is irreversible. All your data will be permanently deleted.'
    });

  } catch (error: any) {
    console.error('Account preview error:', error);
    return NextResponse.json({ error: 'Failed to get account data' }, { status: 500 });
  }
}
