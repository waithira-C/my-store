"use client";

import { MotionConfig } from "framer-motion";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";

export type AuthField = "name" | "email" | "password" | null;

type AuthFocusValue = {
  activeField: AuthField;
  setActiveField: (field: AuthField) => void;
};

const AuthFocusContext = createContext<AuthFocusValue>({
  activeField: null,
  setActiveField: () => {},
});

export function AuthFocusProvider({ children }: { children: ReactNode }) {
  const [activeField, setActiveField] = useState<AuthField>(null);
  const value = useMemo(() => ({ activeField, setActiveField }), [activeField]);

  return (
    <AuthFocusContext.Provider value={value}>
      {/* reducedMotion="user" makes every motion.* component drop transforms
          when the OS asks for less motion. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </AuthFocusContext.Provider>
  );
}

export function useAuthFocus() {
  return useContext(AuthFocusContext);
}

const TRACKED_FIELDS = new Set(["name", "email", "password"]);

/**
 * Spread onto the <form>, not onto each input.
 *
 * React's onFocus/onBlur are really bubbling focusin/focusout, so one pair of
 * handlers covers every field. That matters: per-input handlers fire `blur`
 * before the next `focus`, so tabbing Email -> Password would dip through
 * `null` and the 3D lighting would visibly stutter. Checking `relatedTarget`
 * lets us tell "moved to the next field" from "left the form entirely".
 */
export function useAuthFormFocus() {
  const { setActiveField } = useContext(AuthFocusContext);

  return {
    onFocus: (event: FocusEvent<HTMLFormElement>) => {
      const name = (event.target as HTMLElement).getAttribute("name");
      if (name && TRACKED_FIELDS.has(name)) setActiveField(name as AuthField);
    },
    onBlur: (event: FocusEvent<HTMLFormElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setActiveField(null);
      }
    },
  };
}
