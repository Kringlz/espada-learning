import React from "react";
/** A real form gives browser/password managers a stable credential boundary. */
export function AuthForm({
  children,
  onSubmit,
}: {
  children: React.ReactNode;
  onSubmit: () => void;
}) {
  return (
    <form
      autoComplete="on"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 14, margin: 0 }}
    >
      {children}
    </form>
  );
}
