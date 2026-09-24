import type {
  MysteryCondition,
  MysteryDefinition,
  MysteryHotspotAction,
} from "@/lib/mystery/types";

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

export function getMysteryDefinitionIssues(
  definition: MysteryDefinition,
): string[] {
  const issues: string[] = [];
  const sceneIds = new Set(definition.scenes.map((scene) => scene.id));
  const clueIds = new Set(definition.clues.map((clue) => clue.id));
  const characterIds = new Set(
    (definition.characters ?? []).map((character) => character.id),
  );
  const questionIds = new Set(
    (definition.characters ?? []).flatMap((character) =>
      character.questions.map((question) => question.id),
    ),
  );
  const eventIds = new Set((definition.events ?? []).map((event) => event.id));
  const hotspotIds = new Set(
    definition.scenes.flatMap((scene) =>
      scene.hotspots.map((hotspot) => hotspot.id),
    ),
  );

  if (!sceneIds.has(definition.initialSceneId)) {
    issues.push(
      'Initial scene "' + definition.initialSceneId + '" does not exist.',
    );
  }
  for (const id of duplicates(definition.scenes.map((scene) => scene.id))) {
    issues.push('Duplicate scene id "' + id + '".');
  }
  for (const id of duplicates(definition.clues.map((clue) => clue.id))) {
    issues.push('Duplicate clue id "' + id + '".');
  }
  for (const id of duplicates(
    definition.scenes.flatMap((scene) =>
      scene.hotspots.map((hotspot) => hotspot.id),
    ),
  )) {
    issues.push('Duplicate hotspot id "' + id + '".');
  }

  const validateCondition = (condition: MysteryCondition, owner: string) => {
    if (
      condition.type === "clue_discovered" &&
      !clueIds.has(condition.clueId)
    ) {
      issues.push(owner + ' references missing clue "' + condition.clueId + '".');
    }
    if (
      condition.type === "hotspot_inspected" &&
      !hotspotIds.has(condition.hotspotId)
    ) {
      issues.push(
        owner + ' references missing hotspot "' + condition.hotspotId + '".',
      );
    }
    if (
      condition.type === "question_asked" &&
      !questionIds.has(condition.questionId)
    ) {
      issues.push(
        owner + ' references missing question "' + condition.questionId + '".',
      );
    }
    if (
      condition.type === "event_triggered" &&
      !eventIds.has(condition.eventId)
    ) {
      issues.push(owner + ' references missing event "' + condition.eventId + '".');
    }
    if (
      condition.type === "scene_visited" &&
      !sceneIds.has(condition.sceneId)
    ) {
      issues.push(owner + ' references missing scene "' + condition.sceneId + '".');
    }
    if (condition.type === "clue_count" && condition.minimum < 0) {
      issues.push(owner + " has a negative clue-count condition.");
    }
  };

  const validateAction = (action: MysteryHotspotAction, owner: string) => {
    if (action.type === "discover_clue" && !clueIds.has(action.clueId)) {
      issues.push(owner + ' references missing clue "' + action.clueId + '".');
    }
    if (action.type === "change_scene" && !sceneIds.has(action.sceneId)) {
      issues.push(owner + ' references missing scene "' + action.sceneId + '".');
    }
    if (
      action.type === "open_character" &&
      !characterIds.has(action.characterId)
    ) {
      issues.push(
        owner + ' references missing character "' + action.characterId + '".',
      );
    }
    if (action.type === "trigger_event" && !eventIds.has(action.eventId)) {
      issues.push(owner + ' references missing event "' + action.eventId + '".');
    }
  };

  for (const scene of definition.scenes) {
    for (const hotspot of scene.hotspots) {
      const owner = 'Hotspot "' + hotspot.id + '"';
      const { x, y, width, height } = hotspot.area;
      if (
        x < 0 ||
        y < 0 ||
        width <= 0 ||
        height <= 0 ||
        x + width > 100 ||
        y + height > 100
      ) {
        issues.push(owner + " must stay inside the 0–100% scene bounds.");
      }
      validateAction(hotspot.action, owner);
      hotspot.conditions?.forEach((condition) =>
        validateCondition(condition, owner),
      );
    }
  }

  for (const character of definition.characters ?? []) {
    for (const question of character.questions) {
      const owner = 'Question "' + question.id + '"';
      question.conditions?.forEach((condition) =>
        validateCondition(condition, owner),
      );
      if (
        question.reveals?.clueId &&
        !clueIds.has(question.reveals.clueId)
      ) {
        issues.push(
          owner +
            ' reveals missing clue "' +
            question.reveals.clueId +
            '".',
        );
      }
    }
  }

  for (const event of definition.events ?? []) {
    const owner = 'Event "' + event.id + '"';
    event.conditions.forEach((condition) =>
      validateCondition(condition, owner),
    );
    event.actions.forEach((action) => validateAction(action, owner));
  }

  for (const clueId of definition.accusation?.requiredEvidenceIds ?? []) {
    if (!clueIds.has(clueId)) {
      issues.push('Accusation references missing clue "' + clueId + '".');
    }
  }

  return issues;
}
