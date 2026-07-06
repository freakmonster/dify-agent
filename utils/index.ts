export { stripThinkTags, fixMalformedTable } from './markdown'

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
