"use client";

type ConfirmSubmitButtonProps = {
  children: React.ReactNode;
  confirmation: string;
  className?: string;
};

export function ConfirmSubmitButton({ children, confirmation, className }: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
