export function if_public(visibility: string, opts) {
  if (visibility === 'public' || visibility === 'external' || visibility === undefined) {
    return opts.fn(this)
  } else {
    return opts.inverse(this)
  }
}

export function fileName() {
  return `# ${this.id.split('.')[0]}`
}

export function extractParamName(description: string) {
  const potentialParam = description.split(' ')[0]
  if (potentialParam.charAt(0) === potentialParam.charAt(0).toLowerCase()) {
    return potentialParam
  }
  return ''
}

export function extractParamDescription(description: string) {
  const potentialParam = description.split(' ')[0]
  if (potentialParam.charAt(0) === potentialParam.charAt(0).toLowerCase()) {
    return description.replace(potentialParam, '').trim()
  }
  return description
}
