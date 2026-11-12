import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditCardDialog } from "../edit-card-dialog";
import { AuthProvider } from "@/contexts/auth-context";
import type { Card } from "@/lib/types";
import { onAuthStateChanged } from "firebase/auth";

vi.mock("@/lib/firebase-service", () => ({
  cardService: { updateCard: vi.fn() },
}));

const card: Card = {
  id: "card1",
  title: "Test Card",
  description: "Test Description",
  position: 1,
  listId: "list1",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ui = (c: Card) => (
  <AuthProvider>
    <EditCardDialog
      card={c}
      open={true}
      onOpenChange={vi.fn()}
      onCardUpdated={vi.fn()}
    />
  </AuthProvider>
);

describe("EditCardDialog", () => {
  beforeEach(() => {
    (onAuthStateChanged as any).setMockUser({ uid: "123", email: "a@b.c" });
  });

  it("keeps in-progress typing when a snapshot re-supplies the same card", () => {
    const { rerender } = render(ui(card));
    fireEvent.change(screen.getByLabelText("Card Title"), {
      target: { value: "Typing in progress" },
    });

    rerender(ui({ ...card, title: "Remote title", updatedAt: new Date() }));

    expect(screen.getByDisplayValue("Typing in progress")).toBeInTheDocument();
  });

  it("resets the form when a different card is shown", () => {
    const { rerender } = render(ui(card));
    fireEvent.change(screen.getByLabelText("Card Title"), {
      target: { value: "Typing in progress" },
    });

    rerender(ui({ ...card, id: "card2", title: "Other card" }));

    expect(screen.getByDisplayValue("Other card")).toBeInTheDocument();
  });
});
