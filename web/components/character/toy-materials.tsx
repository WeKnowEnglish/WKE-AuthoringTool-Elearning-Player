"use client";

type SkinProps = {
  color: string;
};

/** Soft plastic look used by the toy head. */
export function ToySkinMaterial({ color }: SkinProps) {
  return <meshStandardMaterial color={color} roughness={0.4} metalness={0} />;
}

export function ToyHairMaterial({ color }: SkinProps) {
  return <meshStandardMaterial color={color} roughness={0.55} metalness={0} />;
}
