import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { CardItem } from "../card-item";
import type { Card } from "@/lib/types";
import { renderWithProviders } from "@/lib/__tests__/test-utils";
import { commentService } from "@/lib/firebase-service";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: { uid: "test-user", email: "t@example.com" } }),
}));

vi.mock("@/lib/firebase-service", () => ({
  commentService: {
    getCardComments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  draggable: vi.fn(() => vi.fn()),
  dropTargetForElements: vi.fn(() => vi.fn()),
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", () => ({
  attachClosestEdge: vi.fn(),
  extractClosestEdge: vi.fn(),
}));

vi.mock("../card-detail-dialog", () => ({
  CardDetailDialog: () => <div />,
}));

const baseCard: Card = {
  id: "c1",
  title: "Card",
  listId: "l1",
  position: 1,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const props = {
  boardId: "b1",
  onCardUpdated: vi.fn(),
  onCardDeleted: vi.fn(),
};

describe("CardItem comment count", () => {
  beforeEach(() => {
    vi.mocked(commentService.getCardComments).mockClear();
  });

  it("defers loading while pending, loads once committed", async () => {
    const { rerender } = renderWithProviders(
      <CardItem card={{ ...baseCard, hasPendingWrites: true }} {...props} />,
    );
    expect(commentService.getCardComments).not.toHaveBeenCalled();

    rerender(
      <CardItem card={{ ...baseCard, hasPendingWrites: false }} {...props} />,
    );
    await waitFor(() =>
      expect(commentService.getCardComments).toHaveBeenCalledTimes(1),
    );
    expect(commentService.getCardComments).toHaveBeenCalledWith("c1");
  });
});
