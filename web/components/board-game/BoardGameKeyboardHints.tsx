import { KidPanel } from "@/components/kid-ui/KidPanel";
import { KEYBOARD_SHORTCUTS } from "@/lib/board-game/keyboard-shortcuts";

export function BoardGameKeyboardHints() {
  return (
    <KidPanel className="text-center">
      <h2 className="text-sm font-bold uppercase tracking-wide text-kid-ink/70">
        Teacher keyboard shortcuts
      </h2>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-kid-ink">
        {KEYBOARD_SHORTCUTS.map((shortcut) => (
          <li key={shortcut.keys}>
            <kbd className="rounded border-2 border-kid-ink bg-kid-surface-muted px-2 py-0.5 font-mono text-xs">
              {shortcut.keys}
            </kbd>{" "}
            {shortcut.action}
          </li>
        ))}
      </ul>
    </KidPanel>
  );
}
