export function withCreate<T>(create: () => Promise<T>): Promise<T> {
  return create();
}
