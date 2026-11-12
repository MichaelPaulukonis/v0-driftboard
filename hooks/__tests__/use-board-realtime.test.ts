import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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

import { useBoardRealtime } from "../use-board-realtime";

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
    expect(result.current.boardState.columnMap.l1.items[0].title).toBe("After");
  });

  it("defers snapshots while a move is in flight, applies on reject", async () => {
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
