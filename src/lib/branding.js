export function getBrandWordmark(isJapanese = false) {
  return {
    lead: isJapanese ? 'パス' : 'Pass',
    suffix: 'AI',
    full: isJapanese ? 'パスAI' : 'PassAI',
    iconPath: '/PassAICat.png',
  };
}

export function getBrandTagline(isJapanese = false) {
  return isJapanese
    ? 'もっと賢く、もっと速く合格。'
    : 'Study smarter. Pass faster.';
}
