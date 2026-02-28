import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Habit } from '../types';

interface DbHabit {
  id: string;
  user_id: string;
  title: string;
  streak: number;
  created_at: string;
  frequency: string;
  time: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  estimated_minutes: number | null;
  customer_name: string | null;
  project_name: string | null;
}

interface DbHabitLog {
  id: string;
  habit_id: string;
  completed_date: string;
  created_at: string;
}

export function useHabits(session: Session | null) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id;

  const fetchHabits = useCallback(async () => {
    if (!userId) { setHabits([]); setLoading(false); return; }
    setLoading(true);

    // Fetch habits
    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (habitsError) {
      console.error('Failed to fetch habits:', habitsError);
      setLoading(false);
      return;
    }

    // Fetch all habit logs for this user's habits
    const habitIds = (habitsData as DbHabit[]).map(h => h.id);
    let logsData: DbHabitLog[] = [];

    if (habitIds.length > 0) {
      const { data, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .in('habit_id', habitIds)
        .order('completed_date', { ascending: false });

      if (logsError) {
        console.error('Failed to fetch habit logs:', logsError);
      } else {
        logsData = data as DbHabitLog[];
      }
    }

    // Build habits with completedDays
    const result: Habit[] = (habitsData as DbHabit[]).map(h => {
      const logs = logsData.filter(l => l.habit_id === h.id);
      const completedDays = logs.map(l => l.completed_date);

      // Calculate streak from consecutive days
      const streak = calculateStreak(completedDays);

      return {
        id: h.id,
        title: h.title,
        streak,
        completedDays,
        frequency: (h.frequency || 'daily') as Habit['frequency'],
        time: h.time || undefined,
        dayOfWeek: h.day_of_week ?? undefined,
        dayOfMonth: h.day_of_month ?? undefined,
        monthOfYear: h.month_of_year ?? undefined,
        estimatedMinutes: h.estimated_minutes ?? undefined,
        customerName: h.customer_name || undefined,
        projectName: h.project_name || undefined,
      };
    });

    setHabits(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const addHabit = useCallback(async (title: string, options?: {
    frequency?: Habit['frequency'];
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    monthOfYear?: number;
    estimatedMinutes?: number;
    customerName?: string;
    projectName?: string;
  }): Promise<Habit | null> => {
    if (!userId) return null;

    const insertData: Record<string, unknown> = {
      user_id: userId,
      title: title.trim(),
      frequency: options?.frequency || 'daily',
    };
    if (options?.time) insertData.time = options.time;
    if (options?.dayOfWeek !== undefined) insertData.day_of_week = options.dayOfWeek;
    if (options?.dayOfMonth !== undefined) insertData.day_of_month = options.dayOfMonth;
    if (options?.monthOfYear !== undefined) insertData.month_of_year = options.monthOfYear;
    if (options?.estimatedMinutes) insertData.estimated_minutes = options.estimatedMinutes;
    if (options?.customerName) insertData.customer_name = options.customerName;
    if (options?.projectName) insertData.project_name = options.projectName;

    const { data, error } = await supabase
      .from('habits')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Failed to add habit:', error);
      return null;
    }

    const newHabit: Habit = {
      id: data.id,
      title: data.title,
      streak: 0,
      completedDays: [],
      frequency: (data.frequency || 'daily') as Habit['frequency'],
      time: data.time || undefined,
      dayOfWeek: data.day_of_week ?? undefined,
      dayOfMonth: data.day_of_month ?? undefined,
      monthOfYear: data.month_of_year ?? undefined,
      estimatedMinutes: data.estimated_minutes ?? undefined,
      customerName: data.customer_name || undefined,
      projectName: data.project_name || undefined,
    };
    setHabits(prev => [...prev, newHabit]);
    return newHabit;
  }, [userId]);

  const toggleHabitLog = useCallback(async (habitId: string, date: string) => {
    if (!userId) return;

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const isCompleted = habit.completedDays.includes(date);

    if (isCompleted) {
      // Remove log
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_date', date);

      if (error) {
        console.error('Failed to delete habit log:', error);
        return;
      }
    } else {
      // Add log
      const { error } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, completed_date: date });

      if (error) {
        console.error('Failed to add habit log:', error);
        return;
      }
    }

    // Refetch to get updated streaks
    fetchHabits();
  }, [userId, habits, fetchHabits]);

  const deleteHabit = useCallback(async (habitId: string) => {
    if (!userId) return;

    // Delete logs first, then habit
    await supabase.from('habit_logs').delete().eq('habit_id', habitId);
    const { error } = await supabase.from('habits').delete().eq('id', habitId).eq('user_id', userId);

    if (error) {
      console.error('Failed to delete habit:', error);
      return;
    }

    setHabits(prev => prev.filter(h => h.id !== habitId));
  }, [userId]);

  return { habits, loading, addHabit, toggleHabitLog, deleteHabit, refetch: fetchHabits };
}

function calculateStreak(completedDays: string[]): number {
  if (completedDays.length === 0) return 0;

  const sorted = [...completedDays].sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (sorted[0] !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (sorted[0] !== yesterday) return 0;
  }

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
