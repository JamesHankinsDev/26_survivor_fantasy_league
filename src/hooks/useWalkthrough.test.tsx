import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const getDoc = vi.fn();
const setDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  getDoc: (...args: unknown[]) => getDoc(...args),
  setDoc: (...args: unknown[]) => setDoc(...args),
}));
vi.mock("@/lib/firebase", () => ({ db: {} }));

const shouldPersistSeenFlags = vi.fn();
vi.mock("@/utils/persistEnvironment", () => ({
  shouldPersistSeenFlags: () => shouldPersistSeenFlags(),
}));

import { useWalkthrough, WALKTHROUGH_VERSION } from "./useWalkthrough";

/** Point `window.location.search` at a query string. */
function setSearch(search: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  });
}

const snapshotOf = (data: Record<string, unknown> | undefined) => ({
  data: () => data,
});

beforeEach(() => {
  getDoc.mockReset();
  setDoc.mockReset();
  shouldPersistSeenFlags.mockReset();
  setSearch("");
  setDoc.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useWalkthrough outside production (localhost, LAN, previews)", () => {
  beforeEach(() => shouldPersistSeenFlags.mockReturnValue(false));

  it("always offers the walkthrough, with no Firestore read at all", () => {
    const { result } = renderHook(() => useWalkthrough("u1"));
    expect(result.current.seen).toBe(false);
    expect(getDoc).not.toHaveBeenCalled();
  });

  it("offers it even when the stored flag would say it was seen", () => {
    // Nothing is read, so a stored version can't suppress it locally.
    getDoc.mockResolvedValue(snapshotOf({ walkthroughVersion: 99 }));
    const { result } = renderHook(() => useWalkthrough("u1"));
    expect(result.current.seen).toBe(false);
  });

  it("reports that dismissing will not persist", () => {
    const { result } = renderHook(() => useWalkthrough("u1"));
    expect(result.current.persists).toBe(false);
  });

  it("never writes to Firestore when dismissed", async () => {
    const { result } = renderHook(() => useWalkthrough("u1"));
    await act(async () => {
      await result.current.markSeen();
    });
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("still hides it for the rest of the session once dismissed", async () => {
    const { result } = renderHook(() => useWalkthrough("u1"));
    await act(async () => {
      await result.current.markSeen();
    });
    expect(result.current.seen).toBe(true);
  });

  it("offers it in demo mode, but cannot persist", () => {
    const { result } = renderHook(() =>
      useWalkthrough("demo-user", { canPersist: false }),
    );
    expect(result.current.seen).toBe(false);
    expect(result.current.persists).toBe(false);
  });
});

describe("useWalkthrough in production", () => {
  beforeEach(() => shouldPersistSeenFlags.mockReturnValue(true));

  it("offers it to a user who has never seen this version", async () => {
    getDoc.mockResolvedValue(snapshotOf({ tutorialCompleted: true }));
    const { result } = renderHook(() => useWalkthrough("u1"));
    await waitFor(() => expect(result.current.seen).toBe(false));
    expect(result.current.isFirstEver).toBe(false);
  });

  it("suppresses it for a user already on the current version", async () => {
    getDoc.mockResolvedValue(
      snapshotOf({ walkthroughVersion: WALKTHROUGH_VERSION }),
    );
    const { result } = renderHook(() => useWalkthrough("u1"));
    await waitFor(() => expect(result.current.seen).toBe(true));
  });

  it("re-offers it when the version is bumped past what they saw", async () => {
    getDoc.mockResolvedValue(
      snapshotOf({ walkthroughVersion: WALKTHROUGH_VERSION - 1 }),
    );
    const { result } = renderHook(() => useWalkthrough("u1"));
    await waitFor(() => expect(result.current.seen).toBe(false));
  });

  it("flags a first-ever login, who gets it opened rather than bannered", async () => {
    getDoc.mockResolvedValue(snapshotOf(undefined));
    const { result } = renderHook(() => useWalkthrough("u1"));
    await waitFor(() => expect(result.current.seen).toBe(false));
    expect(result.current.isFirstEver).toBe(true);
  });

  it("persists the version and timestamp on dismiss", async () => {
    getDoc.mockResolvedValue(snapshotOf({ tutorialCompleted: true }));
    const { result } = renderHook(() => useWalkthrough("u1"));
    await waitFor(() => expect(result.current.seen).toBe(false));
    await act(async () => {
      await result.current.markSeen();
    });
    expect(setDoc).toHaveBeenCalledTimes(1);
    const [, payload, opts] = setDoc.mock.calls[0];
    expect(payload).toMatchObject({
      walkthroughVersion: WALKTHROUGH_VERSION,
      tutorialCompleted: true,
    });
    expect(payload.walkthroughSeenAt).toBeInstanceOf(Date);
    expect(opts).toEqual({ merge: true });
  });

  it("fails closed — a read error must not spring a tour on someone", async () => {
    getDoc.mockRejectedValue(new Error("permission denied"));
    const { result } = renderHook(() => useWalkthrough("u1"));
    await waitFor(() => expect(result.current.seen).toBe(true));
  });

  it("stays undecided while the read is in flight", () => {
    getDoc.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useWalkthrough("u1"));
    expect(result.current.seen).toBeNull();
  });

  it("is undecided when signed out, and reads nothing", () => {
    const { result } = renderHook(() => useWalkthrough(null));
    expect(result.current.seen).toBeNull();
    expect(getDoc).not.toHaveBeenCalled();
  });

  it("refuses to persist for a demo account", async () => {
    getDoc.mockResolvedValue(snapshotOf(undefined));
    const { result } = renderHook(() =>
      useWalkthrough("demo-user", { canPersist: false }),
    );
    expect(result.current.persists).toBe(false);
    await act(async () => {
      await result.current.markSeen();
    });
    expect(setDoc).not.toHaveBeenCalled();
  });
});

describe("the ?walkthrough=1 escape hatch", () => {
  it("forces it open in production even when already seen", async () => {
    shouldPersistSeenFlags.mockReturnValue(true);
    getDoc.mockResolvedValue(
      snapshotOf({ walkthroughVersion: WALKTHROUGH_VERSION }),
    );
    setSearch("?walkthrough=1");
    const { result } = renderHook(() => useWalkthrough("u1"));
    expect(result.current.seen).toBe(false);
    // Let the in-flight read settle so it can't reopen the question.
    await act(async () => {});
    expect(result.current.seen).toBe(false);
  });

  it("accepts ?walkthrough=true too", async () => {
    shouldPersistSeenFlags.mockReturnValue(true);
    getDoc.mockResolvedValue(
      snapshotOf({ walkthroughVersion: WALKTHROUGH_VERSION }),
    );
    setSearch("?walkthrough=true");
    const { result } = renderHook(() => useWalkthrough("u1"));
    expect(result.current.seen).toBe(false);
    // Let the in-flight read settle so it can't reopen the question.
    await act(async () => {});
    expect(result.current.seen).toBe(false);
  });

  it("ignores an unrelated query string", async () => {
    shouldPersistSeenFlags.mockReturnValue(true);
    getDoc.mockResolvedValue(
      snapshotOf({ walkthroughVersion: WALKTHROUGH_VERSION }),
    );
    setSearch("?other=1");
    const { result } = renderHook(() => useWalkthrough("u1"));
    await waitFor(() => expect(result.current.seen).toBe(true));
  });
});
