export function objectDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
