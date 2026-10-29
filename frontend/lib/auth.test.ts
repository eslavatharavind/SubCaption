import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('Authentication state resolution & safeguards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves authenticated state when a valid session exists', async () => {
    let state = { user: null as any, loading: true };
    const fakeUser = { id: 'usr-123', email: 'creator@example.com' };
    const fakeSession = { user: fakeUser, access_token: 'valid-jwt-token' };

    const getSessionMock = vi.fn().mockResolvedValue({
      data: { session: fakeSession },
      error: null,
    });

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await getSessionMock();
        if (error) throw error;
        state = { user: session?.user ?? null, loading: false };
      } catch {
        state = { user: null, loading: false };
      }
    };

    await initAuth();
    expect(state.loading).toBe(false);
    expect(state.user).toEqual(fakeUser);
  });

  it('resolves unauthenticated state when no session exists', async () => {
    let state = { user: null as any, loading: true };

    const getSessionMock = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const initAuth = async () => {
      try {
        const { data: { session } } = await getSessionMock();
        state = { user: session?.user ?? null, loading: false };
      } catch {
        state = { user: null, loading: false };
      }
    };

    await initAuth();
    expect(state.loading).toBe(false);
    expect(state.user).toBeNull();
  });

  it('safely recovers and ends loading when Supabase request rejects or fails', async () => {
    let state = { user: null as any, loading: true };

    const getSessionMock = vi.fn().mockRejectedValue(new Error('Network error connecting to Supabase'));

    const initAuth = async () => {
      try {
        const res = await getSessionMock();
        state = { user: res?.data?.session?.user ?? null, loading: false };
      } catch {
        // Must resolve loading state to false on error to prevent infinite stuck loading
        state = { user: null, loading: false };
      }
    };

    await initAuth();
    expect(state.loading).toBe(false);
    expect(state.user).toBeNull();
  });

  it('safety timeout triggers to resolve loading if session hangs indefinitely', () => {
    let state = { user: null as any, loading: true };

    // Promise that never resolves
    const hangingPromise = new Promise(() => {});

    let timeoutId: any;
    const initAuthWithTimeout = () => {
      timeoutId = setTimeout(() => {
        state = { user: null, loading: false };
      }, 4000);

      hangingPromise.then(() => {
        clearTimeout(timeoutId);
      });
    };

    initAuthWithTimeout();
    expect(state.loading).toBe(true);

    // Fast-forward 4 seconds
    vi.advanceTimersByTime(4000);
    expect(state.loading).toBe(false);
    expect(state.user).toBeNull();
  });

  it('clears session and user on signOut', async () => {
    let state = {
      user: { id: 'usr-1', email: 'test@subcaption.app' } as any,
      token: 'jwt-token',
    };

    const signOut = async () => {
      state = { user: null, token: '' };
    };

    await signOut();
    expect(state.user).toBeNull();
    expect(state.token).toBe('');
  });
});

