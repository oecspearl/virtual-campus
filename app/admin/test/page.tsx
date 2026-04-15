'use client';

import React, { useState } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import RoleGuard from '@/app/components/RoleGuard';
import Button from '@/app/components/ui/Button';

export default function AdminTestPage() {
  const { supabase } = useSupabase();
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testAdminAccess = async () => {
    try {
      setLoading(true);
      setTestResult('Testing admin access...');

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setTestResult('❌ No session found');
        return;
      }

      // Test user management API
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ Admin access working! Found ${data.users?.length || 0} users`);
      } else {
        const errorData = await response.json();
        setTestResult(`❌ Admin access failed: ${errorData.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Test error:', error);
      setTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard roles={['admin', 'super_admin']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-8">Admin Test Page</h1>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Admin Functionality</h2>
            
            <Button 
              onClick={testAdminAccess} 
              disabled={loading}
              className="mb-4"
            >
              {loading ? 'Testing...' : 'Test Admin Access'}
            </Button>
            
            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.includes('✅') 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={testResult.includes('✅') ? 'text-green-800' : 'text-red-800'}>
                  {testResult}
                </p>
              </div>
            )}
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Available Admin Features:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><a href="/admin/users" className="text-oecs-lime-green hover:underline">Basic User Management</a></li>
                <li><a href="/admin/users/manage" className="text-oecs-lime-green hover:underline">Advanced User Management</a></li>
                <li>Create new users with passwords</li>
                <li>Enroll users in courses</li>
                <li>Bulk import users via CSV</li>
                <li>Manage user roles and permissions</li>
                <li>View and manage course enrollments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
