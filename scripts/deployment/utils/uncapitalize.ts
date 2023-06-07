export function uncapitalize(value: string) {
  return value !== '' ? `${value[0].toLowerCase()}${value.substring(1)}` : ''
}
