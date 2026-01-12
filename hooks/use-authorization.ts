"use client";

import { useBoardContext } from "@/contexts/board-context";
import { canPerformAction, type PermissionAction } from "@/lib/permissions";
import { type BoardRole } from "@/lib/types";

export function useAuthorization() {
  const context = useBoardContext();

  const checkPermission = (action: PermissionAction) => {
    return context.can(action);
  };

  const checkRole = (role: BoardRole) => {
    return context.userRole === role;
  };

  return {
    can: checkPermission,
    is: checkRole,
    role: context.userRole,
  };
}
