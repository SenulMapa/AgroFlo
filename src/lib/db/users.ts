import { supabase } from '../supabase';
import type { User, UserRole } from '@/types';

export async function loginUser(employeeId: string, role: UserRole): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('role', role)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('Login error:', error);
    return null;
  }

  return {
    id: data.id,
    employeeId: data.employee_id,
    name: data.name,
    role: data.role,
    avatar: data.avatar_url,
  };
}

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data.map(user => ({
    id: user.id,
    employeeId: user.employee_id,
    name: user.name,
    role: user.role,
    avatar: user.avatar_url,
  }));
}