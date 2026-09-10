export function pictureStoryFrameNav(frameCount: number, frameIndex: number) {
  const count = Math.max(0, frameCount);
  const lastIndex = Math.max(0, count - 1);
  const index = Math.min(Math.max(0, frameIndex), lastIndex);
  const single = count <= 1;
  return {
    count,
    index,
    single,
    isFirst: index <= 0,
    isLast: count === 0 || index >= lastIndex,
    showPager: count > 1,
    pageLabel: single ? "Look at the picture" : `Page ${index + 1} of ${count}`,
    reviewPageLabel: single ? "Story picture" : `Story page ${index + 1} of ${count}`,
    overviewLine: single ? "Look at the picture." : "Look at each picture.",
    overviewCue: single
      ? "Look at the picture. Then answer."
      : "Look at each picture. Then answer.",
    lookAgainLabel: single ? "Look at the picture again" : "Look at the story again",
    backToFramesLabel: single ? "Back to picture" : "Back to story",
  };
}
