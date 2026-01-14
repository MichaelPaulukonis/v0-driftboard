"use client";

import React from "react";
import { AuthContext } from "@/contexts/auth-context";
import { BoardContext } from "@/contexts/board-context";
import { ColumnContext } from "@/contexts/column-context";
import { CardItem } from "@/components/card-item";
import { Card } from "@/lib/types";

// Mock Context Values
const mockAuthValue = {
  user: {
    uid: "test-user",
    email: "test@example.com",
    displayName: "Test User",
  } as any,
  loading: false,
};

const mockBoardContextValue = {
  reorderCard: () => {},
  reorderList: () => {},
  moveCard: () => {},
  instanceId: Symbol("test-instance"),
  userRole: "owner" as const,
  can: () => true,
};

const mockColumnContextValue = {
  listId: "test-list-1",
};

// Mock Cards
const normalCard: Card = {
  id: "card-normal",
  listId: "test-list-1",
  title: "Normal Card",
  description: "This is a normal card description.",
  status: "pending",
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: "test-user",
};

const longUrlCard: Card = {
  id: "card-long-url",
  listId: "test-list-1",
  title: "Long URL Card",
  description:
    "Here is a long URL: https://www.example.com/some/really/long/path/that/might/break/the/layout/if/not/handled/correctly/and/continues/forever/with/more/parameters?foo=bar&baz=qux",
  status: "pending",
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: "test-user",
};

const unbrokenTextCard: Card = {
  id: "card-unbroken",
  listId: "test-list-1",
  title: "Unbroken Text Card",
  description:
    "ThisWordIsExtremelyLongAndShouldBreakButMightNotIfWeDontHaveTheRightCSSPropertiesSetOnTheContainerOrTheTextElementItselfSoWeNeedToCheckThat.",
  status: "pending",
  order: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: "test-user",
};

const codeBlockCard: Card = {
  id: "card-code",
  listId: "test-list-1",
  title: "Code Block Card",
  description:
    "Some code: `const veryLongVariableNameThatShouldProbablyWrapOrScroll = 'some value that is also quite long';`",
  status: "pending",
  order: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: "test-user",
};

const unbrokenTitleCard: Card = {
  id: "card-unbroken-title",
  listId: "test-list-1",
  title:
    "ExtremelyLongTitleThatShouldBreakToNextLineOtherwiseItWillCauseOverflowIssuesInTheCardHeaderSection",
  description: "Description for card with long title.",
  status: "pending",
  order: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: "test-user",
};

const fileUrlCard: Card = {
  id: "card-file-url",
  listId: "test-list-1",
  title: "File URL Card",
  description:
    "Check out this local file: file:///Users/michaelpaulukonis/Downloads/Aws_Services_Cheat_Sheet.pdf it is very useful.",
  status: "pending",
  order: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  authorId: "test-user",
};

export default function CardLayoutTestPage() {
  return (
    <AuthContext.Provider value={mockAuthValue}>
      <BoardContext.Provider value={mockBoardContextValue}>
        <ColumnContext.Provider value={mockColumnContextValue}>
          <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Card Layout Visual Test</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-4 w-72 md:w-80">
                <h2 className="font-semibold">Normal Card</h2>
                <CardItem
                  card={normalCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />

                <h2 className="font-semibold">Long URL</h2>
                <CardItem
                  card={longUrlCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />

                <h2 className="font-semibold">Unbroken Text</h2>
                <CardItem
                  card={unbrokenTextCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />
                <h2 className="font-semibold">Code Block</h2>
                <CardItem
                  card={codeBlockCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />
                <h2 className="font-semibold">Long Title</h2>
                <CardItem
                  card={unbrokenTitleCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />
                <h2 className="font-semibold">File URL</h2>
                <CardItem
                  card={fileUrlCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />
              </div>

              {/* Constrained container to mimic mobile on desktop */}
              <div className="space-y-4 w-[320px] border-2 border-dashed border-red-500 p-2">
                <div className="text-red-500 font-bold mb-2">
                  320px Width Constraint
                </div>
                <CardItem
                  card={longUrlCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />
                <CardItem
                  card={unbrokenTextCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />
                <CardItem
                  card={unbrokenTitleCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />
                <CardItem
                  card={fileUrlCard}
                  boardId="test-board"
                  onCardUpdated={() => {}}
                  onCardDeleted={() => {}}
                />
              </div>
            </div>
          </div>
        </ColumnContext.Provider>
      </BoardContext.Provider>
    </AuthContext.Provider>
  );
}
