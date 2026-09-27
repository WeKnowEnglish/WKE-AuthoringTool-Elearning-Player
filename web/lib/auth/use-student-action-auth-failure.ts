"use client";

import { useCallback, useState } from "react";

import {
  isStudentActionAuthFailure,
  type StudentActionAuthFailure,
} from "@/lib/auth/student-action-auth";

type CapturedStudentActionAuthFailure = {
  action: string;
  failure: StudentActionAuthFailure;
};

export function useStudentActionAuthFailure() {
  const [authFailure, setAuthFailure] =
    useState<CapturedStudentActionAuthFailure | null>(null);

  const captureAuthFailure = useCallback((value: unknown, action: string) => {
    if (!isStudentActionAuthFailure(value)) {
      return false;
    }

    setAuthFailure({ action, failure: value });
    return true;
  }, []);

  const clearAuthFailure = useCallback(() => {
    setAuthFailure(null);
  }, []);

  return { authFailure, captureAuthFailure, clearAuthFailure };
}
