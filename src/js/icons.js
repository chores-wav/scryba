window.iconSvg = function iconSvg(name, className = '') {
  const iconName = String(name || 'sparkles').replace(/[^a-z0-9-]/gi, '');
  const classes = `scryba-icon ${String(className).replace(/[^a-z0-9 _-]/gi, '')}`.trim();
  if (iconName === 'book') return `<span class="${classes} scryba-book-icon" aria-hidden="true"></span>`;
  if (iconName === 'tree') return `<span class="${classes} scryba-family-tree-icon" aria-hidden="true"></span>`;
  if (iconName === 'dice') return `<span class="${classes} scryba-rpg-icon" aria-hidden="true"></span>`;
  if (iconName === 'potion') return `<span class="${classes} scryba-potion-icon" aria-hidden="true"></span>`;
  if (iconName === 'settings') return `<span class="${classes} scryba-settings-icon" aria-hidden="true"></span>`;
  return `<svg class="${classes}" aria-hidden="true" focusable="false"><use href="#icon-${iconName}"></use></svg>`;
};
