let initialization: Promise<void> | undefined;

export default function initializeProviderModels() {
  return initialization ??= Promise.resolve();
}
