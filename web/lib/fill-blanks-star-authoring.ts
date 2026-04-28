/**
 * Convert teacher *asterisk* authoring to fill_blanks payload (template + blanks).
 * Synonyms inside a blank: *word1|word2*
 */

export type StarredToPayloadOk = {
  ok: true;
  template: string;
  blanks: { id: string; acceptable: string[] }[];
};

export type StarredToPayloadErr = {
  ok: false;
  error: string;
};

export type StarredToPayloadResult = StarredToPayloadOk | StarredToPayloadErr;

/**
 * Parse text with *...* segments into __1__, __2__, ... template and blanks array.
 */
export function starredTextToPayload(starred: string): StarredToPayloadResult {
  const src = starred;
  const re = /\*([^*]*)\*/g;
  const blanks: { id: string; acceptable: string[] }[] = [];
  let template = "";
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) {
      template += src.slice(last, m.index);
    }
    idx += 1;
    const id = String(idx);
    const inner = m[1];
    if (!inner.trim()) {
      return { ok: false, error: "Empty blank between asterisks." };
    }
    const acceptable = inner
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (acceptable.length === 0) {
      return { ok: false, error: "Each blank needs at least one acceptable answer." };
    }
    blanks.push({ id, acceptable });
    template += `__${id}__`;
    last = m.index + m[0].length;
  }
  if (last < src.length) {
    template += src.slice(last);
  }

  if (blanks.length === 0) {
    return { ok: false, error: "Add at least one blank using asterisks, e.g. The *cat* sat." };
  }

  return { ok: true, template, blanks };
}

/**
 * Convert stored template + blanks back to *a|b* display for the editor.
 */
export function payloadToStarredText(
  template: string,
  blanks: { id: string; acceptable: string[] }[],
): string {
  const byId = new Map(blanks.map((b) => [b.id, b]));
  const re = /__([^_]+)__/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    if (m.index > last) {
      out += template.slice(last, m.index);
    }
    const id = m[1];
    const b = byId.get(id);
    const inner = b?.acceptable.length
      ? b.acceptable.join("|")
      : id;
    out += `*${inner}*`;
    last = m.index + m[0].length;
  }
  if (last < template.length) {
    out += template.slice(last);
  }
  return out;
}
