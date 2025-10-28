export const widget = import.meta.glob('./**', {
  base: '../widget',
  query: '?raw',
  import: 'default',
  exhaustive: true,
  eager: true,
}) as Record<string, string>
