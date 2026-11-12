import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { List, Card } from "@/lib/types";

type ListsHandler = (lists: List[]) => void;
type CardsHandler = (cards: Card[]) => void;
type ErrHandler = (e: Error) => void;

const listSub: {
  onNext?: ListsHandler;
  onError?: ErrHandler;
  unsub: ReturnType<typeof vi.fn>;
} = { unsub: vi.fn() };
const cardSubs = new Map<
  string,
  {
    onNext: CardsHandler;
    onError?: ErrHandler;
    unsub: ReturnType<typeof vi.fn>;
  }
>();

const subscribeBoardLists = vi.fn(
  (_boardId: string, onNext: ListsHandler, onError?: ErrHandler) => {
    listSub.onNext = onNext;
    listSub.onError = onError;
    listSub.unsub = vi.fn();
    return listSub.unsub;
  },
);
const subscribeListCards = vi.fn(
  (listId: string, onNext: CardsHandler, onError?: ErrHandler) => {
    const unsub = vi.fn();
    cardSubs.set(listId, { onNext, onError, unsub });
    return unsub;
  },
);

vi.mock("@/lib/firebase-service", () => ({
  listService: {
    subscribeBoardLists: (...args: Parameters<typeof subscribeBoardLists>) =>
      subscribeBoardLists(...args),
  },
  cardService: {
    subscribeListCards: (...args: Parameters<typeof subscribeListCards>) =>
      subscribeListCards(...args),
  },
}));

import {
  useBoardRealtime,
  PENDING_MOVE_TIMEOUT_MS,
  SETTLE_GRACE_MS,
} from "../use-board-realtime";

const now = new Date("2026-01-01T00:00:00Z");

function makeList(id: string, position = 0): List {
  return {
    id,
    title: `List ${id}`,
    boardId: "b1",
    position,
    status: "active",
    createdAt: now,
    updatedAt: now,
  } as unknown as List;
}

function makeCard(
  id: string,
  listId: string,
  title = `Card ${id}`,
  position = 0,
): Card {
  return {
    id,
    title,
    listId,
    position,
    status: "active",
    createdAt: now,
    updatedAt: now,
  } as unknown as Card;
}

function emitLists(lists: List[]) {
  act(() => listSub.onNext!(lists));
}
function emitCards(listId: string, cards: Card[]) {
  act(() => cardSubs.get(listId)!.onNext(cards));
}

beforeEach(() => {
  vi.clearAllMocks();
  cardSubs.clear();
  listSub.onNext = undefined;
  listSub.onError = undefined;
});

describe("useBoardRealtime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("subscribes to lists then each list's cards when enabled", () => {
    renderHook(() => useBoardRealtime("b1", true));
    expect(subscribeBoardLists).toHaveBeenCalledWith(
      "b1",
      expect.any(Function),
      expect.any(Function),
    );
    expect(subscribeListCards).not.toHaveBeenCalled();
    emitLists([makeList("l1", 0), makeList("l2", 1)]);
    expect(subscribeListCards).toHaveBeenCalledTimes(2);
    expect([...cardSubs.keys()]).toEqual(["l1", "l2"]);
  });

  it("subscribes nothing when disabled", () => {
    renderHook(() => useBoardRealtime("b1", false));
    expect(subscribeBoardLists).not.toHaveBeenCalled();
    expect(subscribeListCards).not.toHaveBeenCalled();
  });

  it("applies live remote card updates to the column", () => {
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1")]);
    emitCards("l1", [makeCard("c1", "l1", "Original")]);
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe(
      "Original",
    );
    emitCards("l1", [makeCard("c1", "l1", "Edited remotely")]);
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe(
      "Edited remotely",
    );
    expect(result.current.boardState.orderedColumnIds).toEqual(["l1"]);
    expect(result.current.boardState.lastOperation).toBeNull();
  });

  it("attaches a card listener for added lists and detaches removed lists", () => {
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1", 0), makeList("l2", 1)]);
    emitCards("l1", []);
    emitCards("l2", []);
    const l1Unsub = cardSubs.get("l1")!.unsub;
    const l2Unsub = cardSubs.get("l2")!.unsub;

    emitLists([makeList("l2", 1), makeList("l3", 2)]);
    expect(subscribeListCards).toHaveBeenCalledTimes(3);
    expect(subscribeListCards).toHaveBeenLastCalledWith(
      "l3",
      expect.any(Function),
      expect.any(Function),
    );
    expect(l1Unsub).toHaveBeenCalledTimes(1);
    expect(l2Unsub).not.toHaveBeenCalled();
    expect(result.current.boardState.columnMap.l1).toBeUndefined();
    expect(result.current.boardState.orderedColumnIds).toEqual(["l2", "l3"]);
  });

  it("unsubscribes everything on unmount", () => {
    const { unmount } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1"), makeList("l2", 1)]);
    const listUnsub = listSub.unsub;
    const unsubs = [...cardSubs.values()].map((s) => s.unsub);
    unmount();
    expect(listUnsub).toHaveBeenCalledTimes(1);
    unsubs.forEach((u) => expect(u).toHaveBeenCalledTimes(1));
  });

  it("dedupes a card that appears in two lists (first list wins)", () => {
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1", 0), makeList("l2", 1)]);
    emitCards("l1", [makeCard("c1", "l1")]);
    emitCards("l2", [makeCard("c1", "l2"), makeCard("c2", "l2")]);
    const { columnMap } = result.current.boardState;
    expect(columnMap.l1.items.map((c) => c.id)).toEqual(["c1"]);
    expect(columnMap.l2.items.map((c) => c.id)).toEqual(["c2"]);
  });

  it("stays loading until every list has a first card snapshot", () => {
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    expect(result.current.loading).toBe(true);
    emitLists([makeList("l1"), makeList("l2", 1)]);
    expect(result.current.loading).toBe(true);
    emitCards("l1", []);
    expect(result.current.loading).toBe(true);
    emitCards("l2", []);
    expect(result.current.loading).toBe(false);
  });

  it("clears loading immediately on a zero-list snapshot", () => {
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.boardState.orderedColumnIds).toEqual([]);
  });

  it("sets error when the list listener errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    const err = new Error("permission-denied");
    act(() => listSub.onError!(err));
    expect(result.current.error).toBe(err);
    consoleSpy.mockRestore();
  });

  it("sets error when a card listener errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1")]);
    const err = new Error("card boom");
    act(() => cardSubs.get("l1")!.onError!(err));
    expect(result.current.error).toBe(err);
    consoleSpy.mockRestore();
  });

  it("defers snapshots while a move is in flight, applies on resolve", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1")]);
    emitCards("l1", [makeCard("c1", "l1", "Before")]);

    let resolve!: () => void;
    const p = new Promise<void>((r) => (resolve = r));
    act(() => {
      result.current.trackPendingMove(p);
    });
    emitCards("l1", [makeCard("c1", "l1", "After")]);
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe(
      "Before",
    );

    await act(async () => {
      resolve();
      await p;
    });
    act(() => {
      vi.advanceTimersByTime(SETTLE_GRACE_MS);
    });
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe("After");
  });

  it("defers snapshots while a move is in flight, applies on reject", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1")]);
    emitCards("l1", [makeCard("c1", "l1", "Before")]);

    let reject!: (e: Error) => void;
    const p = new Promise<void>((_, r) => (reject = r));
    let returned!: Promise<void>;
    act(() => {
      returned = result.current.trackPendingMove(p);
    });
    expect(returned).toBe(p);
    emitCards("l1", [makeCard("c1", "l1", "After")]);
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe(
      "Before",
    );

    await act(async () => {
      reject(new Error("move failed"));
      await p.catch(() => {});
    });
    act(() => {
      vi.advanceTimersByTime(SETTLE_GRACE_MS);
    });
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe("After");
  });

  it("defers snapshots while dragging, applies when drag ends", () => {
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1")]);
    emitCards("l1", [makeCard("c1", "l1", "Before")]);

    act(() => result.current.setDragging(true));
    emitCards("l1", [makeCard("c1", "l1", "After")]);
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe(
      "Before",
    );

    act(() => result.current.setDragging(false));
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe("After");
  });

  it("resyncFromLatest rebuilds state from the latest snapshots", () => {
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1")]);
    emitCards("l1", [makeCard("c1", "l1", "Server")]);

    act(() =>
      result.current.setBoardState((prev) => ({
        ...prev,
        columnMap: {
          ...prev.columnMap,
          l1: { ...prev.columnMap.l1, items: [] },
        },
      })),
    );
    expect(result.current.boardState.columnMap.l1.items).toEqual([]);

    act(() => result.current.resyncFromLatest());
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe(
      "Server",
    );
  });
});

describe("useBoardRealtime hardening", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setupOneList(title = "Before") {
    const hook = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1")]);
    emitCards("l1", [makeCard("c1", "l1", title)]);
    return hook;
  }
  const titleOf = (r: { current: ReturnType<typeof useBoardRealtime> }) =>
    r.current.boardState.columnMap.l1.items[0]?.title;

  it("clears loading when a card listener errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1")]);
    expect(result.current.loading).toBe(true);
    act(() => cardSubs.get("l1")!.onError!(new Error("boom")));
    expect(result.current.loading).toBe(false);
    consoleSpy.mockRestore();
  });

  it("clears loading when the list listener errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    expect(result.current.loading).toBe(true);
    act(() => listSub.onError!(new Error("boom")));
    expect(result.current.loading).toBe(false);
    consoleSpy.mockRestore();
  });

  it("stops deferring after PENDING_MOVE_TIMEOUT_MS if a move never settles", () => {
    vi.useFakeTimers();
    const { result } = setupOneList();
    expect(PENDING_MOVE_TIMEOUT_MS).toBe(10_000);
    act(() => {
      result.current.trackPendingMove(new Promise<void>(() => {}));
    });
    emitCards("l1", [makeCard("c1", "l1", "After")]);
    expect(titleOf(result)).toBe("Before");
    act(() => {
      vi.advanceTimersByTime(PENDING_MOVE_TIMEOUT_MS);
    });
    expect(titleOf(result)).toBe("After");
  });

  it("does not double-decrement when a timed-out move later settles", async () => {
    vi.useFakeTimers();
    const { result } = setupOneList();
    let resolveFirst!: () => void;
    const first = new Promise<void>((r) => (resolveFirst = r));
    act(() => {
      result.current.trackPendingMove(first);
    });
    act(() => {
      vi.advanceTimersByTime(PENDING_MOVE_TIMEOUT_MS);
    });

    act(() => {
      result.current.trackPendingMove(new Promise<void>(() => {}));
    });
    emitCards("l1", [makeCard("c1", "l1", "After")]);
    expect(titleOf(result)).toBe("Before");

    await act(async () => {
      resolveFirst();
      await first;
    });
    expect(titleOf(result)).toBe("Before");
  });

  it("keeps optimistic state when drag ends with no deferred emission", () => {
    const { result } = setupOneList("Server");
    act(() =>
      result.current.setBoardState((prev) => ({
        ...prev,
        columnMap: {
          ...prev.columnMap,
          l1: { ...prev.columnMap.l1, items: [] },
        },
      })),
    );
    act(() => result.current.setDragging(true));
    act(() => result.current.setDragging(false));
    expect(result.current.boardState.columnMap.l1.items).toEqual([]);
  });

  it("stays deferred until all overlapping moves settle", async () => {
    vi.useFakeTimers();
    const { result } = setupOneList();
    let r1!: () => void;
    let r2!: () => void;
    const p1 = new Promise<void>((r) => (r1 = r));
    const p2 = new Promise<void>((r) => (r2 = r));
    act(() => {
      result.current.trackPendingMove(p1);
      result.current.trackPendingMove(p2);
    });
    emitCards("l1", [makeCard("c1", "l1", "After")]);
    await act(async () => {
      r1();
      await p1;
    });
    act(() => {
      vi.advanceTimersByTime(SETTLE_GRACE_MS);
    });
    expect(titleOf(result)).toBe("Before");
    await act(async () => {
      r2();
      await p2;
    });
    act(() => {
      vi.advanceTimersByTime(SETTLE_GRACE_MS);
    });
    expect(titleOf(result)).toBe("After");
  });

  it("stays deferred when drag ends while a move is pending", () => {
    const { result } = setupOneList();
    act(() => {
      result.current.setDragging(true);
      result.current.trackPendingMove(new Promise<void>(() => {}));
    });
    emitCards("l1", [makeCard("c1", "l1", "After")]);
    act(() => result.current.setDragging(false));
    expect(titleOf(result)).toBe("Before");
  });

  it("ignores late emissions from a removed list's listener", () => {
    const { result } = renderHook(() => useBoardRealtime("b1", true));
    emitLists([makeList("l1", 0), makeList("l2", 1)]);
    emitCards("l1", []);
    emitCards("l2", []);
    const staleOnNext = cardSubs.get("l1")!.onNext;
    emitLists([makeList("l2", 1)]);
    act(() => staleOnNext([makeCard("c9", "l1")]));
    expect(result.current.boardState.columnMap.l1).toBeUndefined();
    expect(result.current.boardState.orderedColumnIds).toEqual(["l2"]);
  });

  it("resubscribes when boardId changes", () => {
    const { rerender } = renderHook(({ id }) => useBoardRealtime(id, true), {
      initialProps: { id: "b1" },
    });
    emitLists([makeList("l1")]);
    const oldListUnsub = listSub.unsub;
    const oldCardUnsub = cardSubs.get("l1")!.unsub;
    rerender({ id: "b2" });
    expect(oldListUnsub).toHaveBeenCalledTimes(1);
    expect(oldCardUnsub).toHaveBeenCalledTimes(1);
    expect(subscribeBoardLists).toHaveBeenLastCalledWith(
      "b2",
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("waits SETTLE_GRACE_MS after a move settles before flushing", async () => {
    vi.useFakeTimers();
    expect(SETTLE_GRACE_MS).toBe(300);
    const { result } = setupOneList();
    let resolve!: () => void;
    const p = new Promise<void>((r) => (resolve = r));
    act(() => {
      result.current.trackPendingMove(p);
    });
    emitCards("l1", [makeCard("c1", "l1", "After")]);

    await act(async () => {
      resolve();
      await p;
    });
    act(() => {
      vi.advanceTimersByTime(SETTLE_GRACE_MS - 1);
    });
    expect(titleOf(result)).toBe("Before");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(titleOf(result)).toBe("After");
  });

  it("clears pending timers on unmount", async () => {
    vi.useFakeTimers();
    const { result, unmount } = setupOneList();
    let resolve!: () => void;
    const p = new Promise<void>((r) => (resolve = r));
    act(() => {
      result.current.trackPendingMove(p);
      result.current.trackPendingMove(new Promise<void>(() => {}));
    });
    await act(async () => {
      resolve();
      await p;
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule a grace timer for a move settling after unmount", async () => {
    vi.useFakeTimers();
    const { result, unmount } = setupOneList();
    let resolve!: () => void;
    const p = new Promise<void>((r) => (resolve = r));
    act(() => {
      result.current.trackPendingMove(p);
    });
    unmount();
    resolve();
    await p;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("defers resyncFromLatest while dragging, applies when drag ends", () => {
    const { result } = setupOneList("Server");
    act(() =>
      result.current.setBoardState((prev) => ({
        ...prev,
        columnMap: {
          ...prev.columnMap,
          l1: { ...prev.columnMap.l1, items: [] },
        },
      })),
    );
    act(() => result.current.setDragging(true));
    act(() => result.current.resyncFromLatest());
    expect(result.current.boardState.columnMap.l1.items).toEqual([]);
    act(() => result.current.setDragging(false));
    expect(titleOf(result)).toBe("Server");
  });
});
