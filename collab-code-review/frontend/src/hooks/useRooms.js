import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const roomKeys = {
  all: ['rooms'],
  lists: () => [...roomKeys.all, 'list'],
  detail: (id) => [...roomKeys.all, 'detail', id],
  comments: (id) => [...roomKeys.all, 'comments', id],
};

// ─── Fetch user rooms ──────────────────────────────────────────────────────────
export const useRooms = () => {
  return useQuery({
    queryKey: roomKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get('/rooms');
      return data.data.rooms;
    },
    staleTime: 30_000,
  });
};

// ─── Fetch single room ─────────────────────────────────────────────────────────
export const useRoom = (roomId) => {
  return useQuery({
    queryKey: roomKeys.detail(roomId),
    queryFn: async () => {
      const { data } = await api.get(`/rooms/${roomId}`);
      return data.data.room;
    },
    enabled: !!roomId,
    staleTime: 15_000,
  });
};

// ─── Fetch room comments ───────────────────────────────────────────────────────
export const useRoomComments = (roomId) => {
  return useQuery({
    queryKey: roomKeys.comments(roomId),
    queryFn: async () => {
      const { data } = await api.get(`/rooms/${roomId}/comments`);
      return data.data.comments;
    },
    enabled: !!roomId,
    staleTime: 10_000,
  });
};

// ─── Create room ───────────────────────────────────────────────────────────────
export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/rooms', payload);
      return data.data.room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
      toast.success('Room created successfully!');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Join room by invite code ──────────────────────────────────────────────────
export const useJoinRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteCode) => {
      const { data } = await api.post('/rooms/join', { inviteCode });
      return data.data.room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
      toast.success('Joined room!');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Archive room ──────────────────────────────────────────────────────────────
export const useArchiveRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomId) => {
      await api.delete(`/rooms/${roomId}`);
      return roomId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
      toast.success('Room archived.');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Add comment ───────────────────────────────────────────────────────────────
export const useAddComment = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post(`/rooms/${roomId}/comments`, payload);
      return data.data.comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.comments(roomId) });
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Resolve comment ───────────────────────────────────────────────────────────
export const useResolveComment = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId) => {
      const { data } = await api.patch(`/comments/${commentId}/resolve`);
      return data.data.comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.comments(roomId) });
    },
    onError: (err) => toast.error(err.message),
  });
};
