import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  HMSReactiveStore,
  selectIsConnectedToRoom,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectLocalPeer,
  selectPeers,
  selectVideoTrackByPeerID,
} from '@100mslive/hms-video-store';
import type { HMSActions, HMSStore, HMSStoreWrapper } from '@100mslive/hms-video-store';

/**
 * useLiveStream — 100ms-backed livestream transport.
 *
 * Public API is intentionally unchanged from the old WebRTC-P2P version so
 * pages (GoLivePage, LivestreamRoom) keep working without edits.
 *
 * Notes for the consumer (LivestreamRoom):
 * - `localStream` (seller) and `remoteStream` (viewer) are MediaStream objects
 *   built lazily from the seller's video+audio tracks. They re-render when
 *   tracks become available.
 * - `viewerCount` reflects 100ms peer count minus the broadcaster.
 * - `endStream()` closes the 100ms room for everyone via leave + DB update.
 */

export type LiveStreamRole = 'seller' | 'viewer';
export type LiveStreamStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

interface Options {
  livestreamId: string | null;
  role: LiveStreamRole;
  userId: string | null;
  onEnded?: () => void;
}

// Singleton 100ms store per browser tab (recommended pattern).
let hmsStoreInstance: HMSReactiveStore | null = null;
function getHms() {
  if (!hmsStoreInstance) {
    hmsStoreInstance = new HMSReactiveStore();
    hmsStoreInstance.triggerOnSubscribe();
  }
  return {
    actions: hmsStoreInstance.getActions() as HMSActions,
    store: hmsStoreInstance.getStore() as HMSStore & HMSStoreWrapper,
  };
}

export function useLiveStream({ livestreamId, role, userId, onEnded }: Options) {
  const [status, setStatus] = useState<LiveStreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localVideoTrackId, setLocalVideoTrackId] = useState<string | null>(null);
  const [remoteVideoTrackId, setRemoteVideoTrackId] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const joinedRef = useRef(false);
  const viewerCountWriteTimer = useRef<number | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);

  const hms = useMemo(() => getHms(), []);

  // ---------- Persist viewer count (seller only, debounced) ----------
  const scheduleViewerCountWrite = useCallback(
    (count: number) => {
      if (role !== 'seller' || !livestreamId) return;
      if (viewerCountWriteTimer.current) clearTimeout(viewerCountWriteTimer.current);
      viewerCountWriteTimer.current = window.setTimeout(() => {
        supabase
          .from('livestreams')
          .update({ viewer_count: count })
          .eq('id', livestreamId)
          .then(({ error }) => {
            if (error) console.warn('viewer_count update failed', error);
          });
      }, 2000);
    },
    [role, livestreamId],
  );

  // ---------- Build a MediaStream from a 100ms peer's video+audio tracks ----------
  const buildStreamForPeer = useCallback((peerId: string): MediaStream | null => {
    const peer = hms.store.getState((s) =>
      s.peers[peerId] ? s.peers[peerId] : null,
    );
    if (!peer) return null;

    const ms = new MediaStream();
    // Video
    if (peer.videoTrack) {
      const native = hms.actions.attachVideo
        ? null
        : null; // attachVideo path uses element-level binding; we use raw tracks below
      const trackObj = hms.store.getState((s) => s.tracks[peer.videoTrack!]);
      const nativeTrack = (trackObj as any)?.nativeTrack as MediaStreamTrack | undefined;
      if (nativeTrack) ms.addTrack(nativeTrack);
    }
    if (peer.audioTrack) {
      const trackObj = hms.store.getState((s) => s.tracks[peer.audioTrack!]);
      const nativeTrack = (trackObj as any)?.nativeTrack as MediaStreamTrack | undefined;
      if (nativeTrack) ms.addTrack(nativeTrack);
    }
    return ms.getTracks().length ? ms : null;
  }, [hms]);

  // ---------- Subscribe to store changes ----------
  useEffect(() => {
    if (!livestreamId) return;

    // Mic / video enabled
    const unsubMic = hms.store.subscribe((enabled) => {
      setMicEnabled(!!enabled);
    }, selectIsLocalAudioEnabled);

    const unsubVid = hms.store.subscribe((enabled) => {
      setVideoEnabled(!!enabled);
    }, selectIsLocalVideoEnabled);

    // Connection status
    const unsubConn = hms.store.subscribe((connected) => {
      if (connected) {
        setStatus('live');
      } else if (joinedRef.current) {
        // Was joined, now disconnected
        setStatus((prev) => (prev === 'ended' ? 'ended' : 'idle'));
      }
    }, selectIsConnectedToRoom);

    // Peers — drives viewerCount + remote stream binding
    const unsubPeers = hms.store.subscribe((peers) => {
      const list = peers || [];
      const broadcasters = list.filter((p) => p.roleName === 'broadcaster' || p.roleName === 'co-broadcaster');
      const viewers = list.filter((p) => p.roleName?.startsWith('viewer'));
      setViewerCount(viewers.length);
      if (role === 'seller') scheduleViewerCountWrite(viewers.length);

      if (role === 'viewer') {
        const broadcaster = broadcasters[0];
        if (broadcaster?.videoTrack) {
          setRemoteVideoTrackId(broadcaster.videoTrack);
          setRemoteStream((prev) => prev || new MediaStream());
        } else {
          setRemoteVideoTrackId(null);
          setRemoteStream(null);
        }
      }
    }, selectPeers);

    // Local peer — drives localStream for seller
    const unsubLocal = hms.store.subscribe((peer) => {
      if (role !== 'seller') return;
      if (peer?.videoTrack) {
        setLocalVideoTrackId(peer.videoTrack);
        setLocalStream((prev) => prev || new MediaStream());
      } else {
        setLocalVideoTrackId(null);
        setLocalStream(null);
      }
    }, selectLocalPeer);

    unsubsRef.current = [unsubMic, unsubVid, unsubConn, unsubPeers, unsubLocal];
    return () => {
      unsubsRef.current.forEach((u) => {
        try { u(); } catch { /* noop */ }
      });
      unsubsRef.current = [];
    };
  }, [livestreamId, role, hms, scheduleViewerCountWrite, buildStreamForPeer]);

  // ---------- Fetch a 100ms join token from our edge function ----------
  const fetchToken = useCallback(
    async (action: 'create-room' | 'viewer-token') => {
      if (!livestreamId) throw new Error('Missing livestream id');
      const { data, error } = await supabase.functions.invoke('hms-token', {
        body: { action, livestreamId },
      });
      if (error) throw new Error(error.message || 'Failed to get stream token');
      if (!data?.authToken) throw new Error('No auth token returned');
      return data as { roomId: string; authToken: string };
    },
    [livestreamId],
  );

  // ---------- Seller: start broadcasting ----------
  const startBroadcast = useCallback(async () => {
    if (!livestreamId || !userId) {
      setError('Missing stream id or user');
      setStatus('error');
      return;
    }
    if (joinedRef.current) return;
    setStatus('connecting');
    setError(null);
    try {
      const { authToken } = await fetchToken('create-room');
      await hms.actions.join({
        userName: 'Seller',
        authToken,
        settings: {
          isAudioMuted: false,
          isVideoMuted: false,
        },
        rememberDeviceSelection: true,
      });
      joinedRef.current = true;
    } catch (e: any) {
      console.error('startBroadcast failed', e);
      setError(e?.message || 'Failed to start broadcast');
      setStatus('error');
      try { await hms.actions.leave(); } catch { /* noop */ }
    }
  }, [livestreamId, userId, fetchToken, hms]);

  // ---------- Viewer: join ----------
  const joinAsViewer = useCallback(async () => {
    if (!livestreamId) {
      setError('Missing stream id');
      setStatus('error');
      return;
    }
    if (joinedRef.current) return;
    setStatus('connecting');
    setError(null);
    try {
      const { authToken } = await fetchToken('viewer-token');
      await hms.actions.join({
        userName: 'Viewer',
        authToken,
        settings: {
          isAudioMuted: true,
          isVideoMuted: true,
        },
      });
      joinedRef.current = true;
    } catch (e: any) {
      console.error('joinAsViewer failed', e);
      setError(e?.message || 'Failed to join stream');
      setStatus('error');
      try { await hms.actions.leave(); } catch { /* noop */ }
    }
  }, [livestreamId, fetchToken, hms]);

  // ---------- Controls ----------
  const toggleMic = useCallback(async () => {
    try {
      await hms.actions.setLocalAudioEnabled(!micEnabled);
    } catch (e) {
      console.warn('toggleMic failed', e);
    }
  }, [hms, micEnabled]);

  const toggleVideo = useCallback(async () => {
    try {
      await hms.actions.setLocalVideoEnabled(!videoEnabled);
    } catch (e) {
      console.warn('toggleVideo failed', e);
    }
  }, [hms, videoEnabled]);

  const toggleCamera = useCallback(async () => {
    if (role !== 'seller') return;
    try {
      // 100ms exposes switchCamera on the local video track
      await (hms.actions as any).switchCamera?.();
      setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    } catch (e) {
      console.warn('toggleCamera failed', e);
    }
  }, [role, hms]);

  const endStream = useCallback(async () => {
    try {
      if (role === 'seller') {
        // endRoom kicks all viewers
        try { await (hms.actions as any).endRoom(false, 'Stream ended'); } catch { /* noop */ }
      }
      await hms.actions.leave();
    } catch (e) {
      console.warn('endStream leave failed', e);
    }
    joinedRef.current = false;
    if (livestreamId && role === 'seller') {
      await supabase
        .from('livestreams')
        .update({ status: 'ended', ended_at: new Date().toISOString(), viewer_count: 0 })
        .eq('id', livestreamId);
    }
    setStatus('ended');
    setLocalStream(null);
    setRemoteStream(null);
    onEnded?.();
  }, [livestreamId, role, hms, onEnded]);

  const leaveStream = useCallback(async () => {
    try { await hms.actions.leave(); } catch { /* noop */ }
    joinedRef.current = false;
    setStatus('idle');
    setLocalStream(null);
    setRemoteStream(null);
  }, [hms]);

  // Seller heartbeat: bump updated_at every 20s while live so shoppers can
  // detect stale streams.
  useEffect(() => {
    if (role !== 'seller' || status !== 'live' || !livestreamId) return;
    const beat = () => {
      supabase
        .from('livestreams')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', livestreamId)
        .then(() => {});
    };
    beat();
    const interval = window.setInterval(beat, 20000);
    return () => window.clearInterval(interval);
  }, [role, status, livestreamId]);

  // Best-effort: mark stream ended if seller closes/reloads the tab.
  useEffect(() => {
    if (role !== 'seller' || status !== 'live' || !livestreamId) return;
    const handler = () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/livestreams?id=eq.${livestreamId}`;
        const body = JSON.stringify({
          status: 'ended',
          ended_at: new Date().toISOString(),
          viewer_count: 0,
        });
        const token = (supabase as any).auth?.session?.()?.access_token;
        fetch(url, {
          method: 'PATCH',
          keepalive: true,
          headers: {
            'content-type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            prefer: 'return=minimal',
          },
          body,
        }).catch(() => {});
      } catch { /* noop */ }
    };
    window.addEventListener('pagehide', handler);
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('pagehide', handler);
      window.removeEventListener('beforeunload', handler);
    };
  }, [role, status, livestreamId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { hms.actions.leave(); } catch { /* noop */ }
      joinedRef.current = false;
      if (viewerCountWriteTimer.current) clearTimeout(viewerCountWriteTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attachVideo = useCallback(async (trackId: string, el: HTMLVideoElement) => {
    try { await hms.actions.attachVideo(trackId, el); } catch (e) { console.warn('attachVideo failed', e); }
  }, [hms]);
  const detachVideo = useCallback(async (trackId: string, el: HTMLVideoElement) => {
    try { await hms.actions.detachVideo(trackId, el); } catch { /* noop */ }
  }, [hms]);

  return {
    status,
    error,
    viewerCount,
    localStream,
    remoteStream,
    localVideoTrackId,
    remoteVideoTrackId,
    micEnabled,
    videoEnabled,
    facingMode,
    startBroadcast,
    joinAsViewer,
    endStream,
    leaveStream,
    toggleMic,
    toggleVideo,
    toggleCamera,
    attachVideo,
    detachVideo,
  };
}
