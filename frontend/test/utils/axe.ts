import axe from 'axe-core';

export async function axeViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}
