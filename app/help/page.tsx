import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/database-helpers';

export default async function HelpPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/help/student');
  }

  const role = user.role || 'student';

  // Redirect to role-specific help page
  if (role === 'admin' || role === 'super_admin') {
    redirect('/help/admin');
  } else if (role === 'instructor' || role === 'curriculum_designer') {
    redirect('/help/instructor');
  } else {
    redirect('/help/student');
  }
}