import { readdirSync, existsSync } from 'fs'

import * as ignoreSpec from './ignoreSpec.json'

const expectedDir = './spec/expected'

function deployCheck() {
  if (!existsSync(expectedDir)) {
    console.log('true')
    return
  }

  const expected = readdirSync(expectedDir)
  if (!expected.every((ignoreSpec as string[]).includes)) {
    console.log('false')
    return
  }

  console.log('true')
}

deployCheck()
