"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { cardService, listService } from "@/lib/firebase-service";
import type { Card, ColumnMap, List } from "@/lib/types";

export type Outcome =
  | {
      type: "list-reorder";
      listId: string;
      startIndex: number;
      finishIndex: number;
    }
  | {
      type: "card-reorder";
      listId: string;
      startIndex: number;
      finishIndex: number;
    }
  | {
      type: "card-move";
      finishListId: string;
      itemIndexInStartList: number;
      itemIndexInFinishList: number;
    };

export type Operation = {
  outcome: Outcome;
};

export type BoardState = {
  columnMap: ColumnMap;
  orderedColumnIds: string[];
  lastOperation: Operation | null;
};

export type UseBoardRealtimeResult = {
  boardState: BoardState;
  setBoardState: Dispatch<SetStateAction<BoardState>>;
  loading: boolean;
  error: Error | null;
  setDragging: (value: boolean) => void;
  trackPendingMove: <T>(promise: Promise<T>) => Promise<T>;
  resyncFromLatest: () => void;
};

/** Max time a tracked move may defer remote snapshots before we stop waiting. */
export const PENDING_MOVE_TIMEOUT_MS = 10_000;

/**
 * Delay after a move's write settles before un-deferring snapshots. A
 * transaction/batch can ack before the listener delivers that commit's
 * snapshot; flushing immediately would briefly show pre-move data.
 */
export const SETTLE_GRACE_MS = 300;

const EMPTY_BOARD_STATE: BoardState = {
  columnMap: {},
  orderedColumnIds: [],
  lastOperation: null,
};

/**
 * Live board state from Firestore listeners (lists + per-list cards).
 * Remote snapshots are deferred while a drag is in progress or a local move
 * is in flight, then applied once idle, so they don't clobber optimistic UI.
 */
export function useBoardRealtime(
  boardId: string | undefined,
  enabled: boolean,
): UseBoardRealtimeResult {
  const [boardState, setBoardState] = useState<BoardState>(EMPTY_BOARD_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const latestListsRef = useRef<List[]>([]);
  const latestCardsByListRef = useRef<Record<string, Card[]>>({});
  const cardUnsubsRef = useRef<Map<string, () => void>>(new Map());
  const initialCardSnapshotIdsRef = useRef<Set<string>>(new Set());
  const isDraggingRef = useRef(false);
  const pendingMovesRef = useRef(0);
  const hasDeferredSnapshotRef = useRef(false);
  const mountedRef = useRef(true);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const buildBoardState = useCallback((): BoardState => {
    const columnMap: ColumnMap = {};
    const orderedColumnIds: string[] = [];
    // Per-list listeners fire independently, so a remotely moved card can
    // briefly appear in both lists. First occurrence in list order wins.
    const seenCardIds = new Set<string>();
    for (const list of latestListsRef.current) {
      const items: Card[] = [];
      for (const card of latestCardsByListRef.current[list.id] ?? []) {
        if (seenCardIds.has(card.id)) continue;
        seenCardIds.add(card.id);
        items.push(card);
      }
      columnMap[list.id] = { ...list, items };
      orderedColumnIds.push(list.id);
    }
    return { columnMap, orderedColumnIds, lastOperation: null };
  }, []);

  const applySnapshot = useCallback(() => {
    if (isDraggingRef.current || pendingMovesRef.current > 0) {
      hasDeferredSnapshotRef.current = true;
      return;
    }
    setBoardState(buildBoardState());
  }, [buildBoardState]);

  const flushDeferredSnapshotIfIdle = useCallback(() => {
    if (
      !isDraggingRef.current &&
      pendingMovesRef.current === 0 &&
      hasDeferredSnapshotRef.current
    ) {
      hasDeferredSnapshotRef.current = false;
      applySnapshot();
    }
  }, [applySnapshot]);

  const trackPendingMove = useCallback(
    <T>(promise: Promise<T>): Promise<T> => {
      pendingMovesRef.current += 1;
      const timers = timersRef.current;
      let settled = false;
      const release = () => {
        pendingMovesRef.current -= 1;
        flushDeferredSnapshotIfIdle();
      };
      // Settle at most once: on the promise settling (plus a grace period for
      // the matching snapshot to arrive) or the timeout, whichever is first.
      // batch.commit() only resolves on server ack, so offline it may never
      // settle - without a cap, live updates would freeze.
      const capTimer = setTimeout(() => {
        timers.delete(capTimer);
        if (settled) return;
        settled = true;
        release();
      }, PENDING_MOVE_TIMEOUT_MS);
      timers.add(capTimer);
      const onSettled = () => {
        if (settled) return;
        settled = true;
        clearTimeout(capTimer);
        timers.delete(capTimer);
        if (!mountedRef.current) return;
        const graceTimer = setTimeout(() => {
          timers.delete(graceTimer);
          release();
        }, SETTLE_GRACE_MS);
        timers.add(graceTimer);
      };
      // then(onSettled, onSettled) rather than finally(): finally() would
      // return a derived promise that re-rejects and goes unhandled.
      promise.then(onSettled, onSettled);
      return promise;
    },
    [flushDeferredSnapshotIfIdle],
  );

  const setDragging = useCallback(
    (value: boolean) => {
      isDraggingRef.current = value;
      if (!value) flushDeferredSnapshotIfIdle();
    },
    [flushDeferredSnapshotIfIdle],
  );

  const resyncFromLatest = useCallback(() => {
    // Mid-drag, don't yank the board out from under the user; the flush on
    // drag end applies it.
    if (isDraggingRef.current) {
      hasDeferredSnapshotRef.current = true;
      return;
    }
    setBoardState(buildBoardState());
  }, [buildBoardState]);

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    return () => {
      mountedRef.current = false;
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!enabled || !boardId) return;

    let active = true;
    let listsReceived = false;
    const cardUnsubs = cardUnsubsRef.current;
    setLoading(true);
    setError(null);

    const updateLoading = () => {
      if (!listsReceived) return;
      const allLoaded = latestListsRef.current.every((list) =>
        initialCardSnapshotIdsRef.current.has(list.id),
      );
      if (allLoaded) setLoading(false);
    };

    const subscribeCards = (listId: string) =>
      cardService.subscribeListCards(
        listId,
        (cards) => {
          // Ignore late emissions after cleanup or after the list was removed.
          if (!active || !cardUnsubs.has(listId)) return;
          latestCardsByListRef.current[listId] = cards;
          initialCardSnapshotIdsRef.current.add(listId);
          updateLoading();
          applySnapshot();
        },
        (err) => {
          if (!active) return;
          console.error(
            `useBoardRealtime: card listener error (${listId})`,
            err,
          );
          setError(err);
          setLoading(false);
        },
      );

    const unsubscribeLists = listService.subscribeBoardLists(
      boardId,
      (lists) => {
        if (!active) return;
        listsReceived = true;
        latestListsRef.current = lists;

        const nextIds = new Set(lists.map((l) => l.id));
        for (const [listId, unsub] of cardUnsubs) {
          if (nextIds.has(listId)) continue;
          unsub();
          cardUnsubs.delete(listId);
          delete latestCardsByListRef.current[listId];
          initialCardSnapshotIdsRef.current.delete(listId);
        }
        for (const list of lists) {
          if (cardUnsubs.has(list.id)) continue;
          // Register before subscribing so a synchronous first emission passes the guard.
          cardUnsubs.set(list.id, () => {});
          cardUnsubs.set(list.id, subscribeCards(list.id));
        }

        updateLoading();
        applySnapshot();
      },
      (err) => {
        if (!active) return;
        console.error("useBoardRealtime: list listener error", err);
        setError(err);
        // Listener errors are terminal - don't leave the page spinning.
        setLoading(false);
      },
    );

    return () => {
      active = false;
      unsubscribeLists();
      for (const unsub of cardUnsubs.values()) unsub();
      cardUnsubs.clear();
      latestListsRef.current = [];
      latestCardsByListRef.current = {};
      initialCardSnapshotIdsRef.current = new Set();
      hasDeferredSnapshotRef.current = false;
    };
  }, [boardId, enabled, applySnapshot]);

  return {
    boardState,
    setBoardState,
    loading,
    error,
    setDragging,
    trackPendingMove,
    resyncFromLatest,
  };
}
