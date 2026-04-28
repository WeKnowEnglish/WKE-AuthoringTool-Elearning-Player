"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "formAction"> & {
  confirmMessage: string;
  formAction?: string | ((formData: FormData) => void | Promise<void>);
};

export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...buttonProps
}: Props) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return <button {...buttonProps} onClick={handleClick} />;
}
