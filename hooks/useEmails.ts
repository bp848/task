import { useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { gws } from '../lib/gws';
import { Email } from '../types';

interface DbEmail {
  id: string;
  user_id: string;
  sender: string;
  subject: string;
  snippet: string | null;
  received_at: string;
  is_read: boolean;
  customer_name: string | null;
  project_name: string | null;
  customer_id: string | null;
  created_at: string;
}

function dbToEmail(row: DbEmail): Email {
  return {
    id: row.id,
    sender: row.sender,
    subject: row.subject,
    snippet: row.snippet || '',
    date: new Date(row.received_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    isRead: row.is_read,
    customerName: row.customer_name || undefined,
    projectName: row.project_name || undefined,
  };
}

export function useEmails(session: Session | null) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = session?.user?.id;

  const fetchFromGmail = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      // gws.gmail を使って最新10件のメッセージを取得
      const gmailData = await gws.gmail.listMessages({
        maxResults: 10,
        labelIds: ['INBOX'],
      });

      if (gmailData && Array.isArray(gmailData)) {
        setEmails(gmailData);

        // Cache to Supabase
        if (userId && gmailData.length > 0) {
          const dbRows = gmailData.map((e: Email) => ({
            id: e.id,
            user_id: userId,
            sender: e.sender,
            subject: e.subject,
            snippet: e.snippet,
            received_at: new Date().toISOString(),
            is_read: e.isRead,
            customer_name: e.customerName || null,
            project_name: e.projectName || null,
          }));

          await supabase
            .from('emails')
            .upsert(dbRows, { onConflict: 'id' });
        }
      }
    } catch (err) {
      console.error('Failed to fetch Gmail:', err);

      // Fallback: load from cache
      if (userId) {
        const { data } = await supabase
          .from('emails')
          .select('*')
          .eq('user_id', userId)
          .order('received_at', { ascending: false })
          .limit(50);

        if (data) {
          setEmails((data as DbEmail[]).map(dbToEmail));
        }
      }
    }

    setLoading(false);
  }, [session, userId]);

  const markAsRead = useCallback(async (emailId: string) => {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isRead: true } : e));

    if (userId) {
      await supabase
        .from('emails')
        .update({ is_read: true })
        .eq('id', emailId)
        .eq('user_id', userId);
    }
  }, [userId]);

  const clearEmails = useCallback(() => {
    setEmails([]);
  }, []);

  return { emails, loading, fetchFromGmail, markAsRead, setEmails, clearEmails };
}
