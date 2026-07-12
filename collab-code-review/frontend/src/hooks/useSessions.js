import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const sessionKeys = {
  all: ['sessions'],
  lists: () => [...sessionKeys.all, 'list'],
  detail: (sessionId) => [...sessionKeys.all, 'detail', sessionId],
};

// ─── Fetch all sessions for authenticated user ─────────────────────────────────
export const useSessions = () => {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get('/sessions');
      return data.data.sessions;
    },
    staleTime: 30_000,
  });
};

// ─── Fetch a single session by UUID ───────────────────────────────────────────
export const useSession = (sessionId) => {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: async () => {
      const { data } = await api.get(`/sessions/${sessionId}`);
      return data.data.session;
    },
    enabled: !!sessionId,
    staleTime: 15_000,
    retry: (failureCount, error) => {
      // Don't retry on 403/404
      if (error?.response?.status === 403 || error?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
};

// ─── Create session ────────────────────────────────────────────────────────────
export const useCreateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, language, code }) => {
      const { data } = await api.post('/sessions', { title, language, code });
      return data.data.session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      // Pre-populate detail cache immediately
      queryClient.setQueryData(sessionKeys.detail(session.sessionId), session);
      toast.success('Session created!');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Join session ──────────────────────────────────────────────────────────────
export const useJoinSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, role }) => {
      const { data } = await api.post(`/sessions/${sessionId}/join`, { role });
      return data.data.session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      queryClient.setQueryData(sessionKeys.detail(session.sessionId), session);
      toast.success('Joined session!');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Update session code (REST fallback) ──────────────────────────────────────
export const useUpdateSessionCode = (sessionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code) => {
      const { data } = await api.patch(`/sessions/${sessionId}/code`, { code });
      return data.data.session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
    onError: (err) => toast.error(`Code save failed: ${err.message}`),
  });
};

// ─── Archive session ───────────────────────────────────────────────────────────
export const useArchiveSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId) => {
      await api.delete(`/sessions/${sessionId}`);
      return sessionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      toast.success('Session archived.');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Session Comments ──────────────────────────────────────────────────────────

export const sessionCommentKeys = {
  all: (sessionId) => ['sessions', sessionId, 'comments'],
};

export const useSessionComments = (sessionId) => {
  return useQuery({
    queryKey: sessionCommentKeys.all(sessionId),
    queryFn: async () => {
      const { data } = await api.get(`/sessions/${sessionId}/comments`);
      return data.data.comments;
    },
    enabled: !!sessionId,
    staleTime: 5000,
  });
};

export const useAddSessionComment = (sessionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lineNumber, text }) => {
      const { data } = await api.post(`/sessions/${sessionId}/comments`, { lineNumber, text });
      return data.data.comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionCommentKeys.all(sessionId) });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useToggleResolveSessionComment = (sessionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, resolved }) => {
      const { data } = await api.patch(`/sessions/${sessionId}/comments/${commentId}/resolve`, { resolved });
      return data.data.comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionCommentKeys.all(sessionId) });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useAddSessionReply = (sessionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, text }) => {
      const { data } = await api.post(`/sessions/${sessionId}/comments/${commentId}/replies`, { text });
      return data.data.comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionCommentKeys.all(sessionId) });
    },
    onError: (err) => toast.error(err.message),
  });
};
