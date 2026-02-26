import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Task } from '../types';

interface DbTask {
  id: string;
  user_id: string;
  title: string;
  customer_name: string | null;
  project_name: string | null;
  details: string | null;
  completed: boolean;
  time_spent: number;
  estimated_time: number;
  start_time: string | null;
  end_time: string | null;
  tags: string[];
  project_id: string;
  date: string;
  created_at: string;
  completed_at: string | null;
  is_routine: boolean | null;
  source_email_id: string | null;
}

function dbToTask(row: DbTask): Task {
  return {
    id: row.id,
    title: row.title,
    customerName: row.customer_name || undefined,
    projectName: row.project_name || undefined,
    details: row.details || undefined,
    completed: row.completed,
    timeSpent: row.time_spent,
    estimatedTime: row.estimated_time,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    tags: row.tags || [],
    projectId: row.project_id,
    date: row.date,
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
    isRoutine: row.is_routine || undefined,
    sourceEmailId: row.source_email_id || undefined,
  };
}

function taskToDb(task: Partial<Task> & { id: string }, userId: string): Partial<DbTask> {
  const db: Record<string, unknown> = { user_id: userId };
  if (task.id !== undefined) db.id = task.id;
  if (task.title !== undefined) db.title = task.title;
  if (task.customerName !== undefined) db.customer_name = task.customerName || null;
  if (task.projectName !== undefined) db.project_name = task.projectName || null;
  if (task.details !== undefined) db.details = task.details || null;
  if (task.completed !== undefined) db.completed = task.completed;
  if (task.timeSpent !== undefined) db.time_spent = task.timeSpent;
  if (task.estimatedTime !== undefined) db.estimated_time = task.estimatedTime;
  if (task.startTime !== undefined) db.start_time = task.startTime || null;
  if (task.endTime !== undefined) db.end_time = task.endTime || null;
  if (task.tags !== undefined) db.tags = task.tags;
  if (task.projectId !== undefined) db.project_id = task.projectId;
  if (task.date !== undefined) db.date = task.date;
  if (task.completedAt !== undefined) db.completed_at = task.completedAt || null;
  if (task.isRoutine !== undefined) db.is_routine = task.isRoutine;
  if (task.sourceEmailId !== undefined) db.source_email_id = task.sourceEmailId || null;
  return db as Partial<DbTask>;
}

export function useZenworkTasks(session: Session | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id;

  const fetchTasks = useCallback(async () => {
    if (!userId) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('zenwork_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch tasks:', error);
    } else {
      setTasks((data as DbTask[]).map(dbToTask));
    }
    setLoading(false);
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('zenwork_tasks_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'zenwork_tasks',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newTask = dbToTask(payload.new as DbTask);
          setTasks(prev => {
            if (prev.some(t => t.id === newTask.id)) return prev;
            return [newTask, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = dbToTask(payload.new as DbTask);
          setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as { id: string }).id;
          setTasks(prev => prev.filter(t => t.id !== deletedId));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const addTask = useCallback(async (
    title: string,
    projectId: string = 'p1',
    tags: string[] = [],
    estimatedTime: number = 3600,
    date: string = new Date().toISOString().split('T')[0],
    startTime?: string,
    isRoutine: boolean = false,
    customerName?: string,
    projectName?: string,
    details?: string
  ): Promise<Task | null> => {
    if (!userId) return null;
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const newTask: Task = {
      id,
      title: title.trim(),
      customerName,
      projectName,
      details,
      completed: false,
      timeSpent: 0,
      estimatedTime,
      startTime: startTime || new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      tags,
      projectId,
      date,
      createdAt: now,
      isRoutine,
    };

    // Optimistic update
    setTasks(prev => [newTask, ...prev]);

    const { error } = await supabase
      .from('zenwork_tasks')
      .insert(taskToDb(newTask, userId));

    if (error) {
      console.error('Failed to add task:', error);
      setTasks(prev => prev.filter(t => t.id !== id));
      return null;
    }
    return newTask;
  }, [userId]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (!userId) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName || null;
    if (updates.projectName !== undefined) dbUpdates.project_name = updates.projectName || null;
    if (updates.details !== undefined) dbUpdates.details = updates.details || null;
    if (updates.evidence !== undefined) dbUpdates.evidence = updates.evidence || null;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.timeSpent !== undefined) dbUpdates.time_spent = updates.timeSpent;
    if (updates.estimatedTime !== undefined) dbUpdates.estimated_time = updates.estimatedTime;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime || null;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime || null;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt || null;
    if (updates.isRoutine !== undefined) dbUpdates.is_routine = updates.isRoutine;

    const { error } = await supabase
      .from('zenwork_tasks')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update task:', error);
      fetchTasks();
    }
  }, [userId, fetchTasks]);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isCompleting = !task.completed;
    const now = new Date().toISOString();
    const endTimeStr = isCompleting
      ? new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      : undefined;

    await updateTask(id, {
      completed: isCompleting,
      completedAt: isCompleting ? now : undefined,
      endTime: endTimeStr || task.endTime,
    });
  }, [tasks, updateTask]);

  const deleteTask = useCallback(async (id: string) => {
    if (!userId) return;
    setTasks(prev => prev.filter(t => t.id !== id));

    const { error } = await supabase
      .from('zenwork_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete task:', error);
      fetchTasks();
    }
  }, [userId, fetchTasks]);

  // Debounced time_spent sync (for timer)
  const syncTimeSpentRef = useRef<NodeJS.Timeout | null>(null);

  const syncTimeSpent = useCallback((id: string, timeSpent: number) => {
    // Update local state immediately
    setTasks(prev => prev.map(t => t.id === id ? { ...t, timeSpent } : t));

    // Debounce DB sync to every 5 seconds
    if (syncTimeSpentRef.current) clearTimeout(syncTimeSpentRef.current);
    syncTimeSpentRef.current = setTimeout(async () => {
      if (!userId) return;
      await supabase
        .from('zenwork_tasks')
        .update({ time_spent: timeSpent })
        .eq('id', id)
        .eq('user_id', userId);
    }, 5000);
  }, [userId]);

  // Merge calendar tasks into local state without persisting
  const mergeCalendarTasks = useCallback((calendarTasks: Task[]) => {
    setTasks(prev => {
      const nonCalendarTasks = prev.filter(t => !t.tags.includes('Calendar'));
      return [...nonCalendarTasks, ...calendarTasks];
    });
  }, []);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    syncTimeSpent,
    mergeCalendarTasks,
    refetch: fetchTasks,
  };
}
