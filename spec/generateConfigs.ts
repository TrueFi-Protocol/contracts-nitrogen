import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'

const originalConfigsDir = './spec/confs'
const generatedConfigsDir = './build/spec'
const expectedDir = './spec/expected'

const tokensPath = './spec/tokens.json'
const ignoreSpecPath = './spec/ignoreSpec.json'

function generateConfigs() {
  const allSpec = process.env.ALL_SPEC === 'true'
  let branchName = process.env.BRANCH || 'local'
  branchName = branchName.replace(/\//g, '-')

  const configs = readdirSync(originalConfigsDir)
  const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'))
  const ignoreSpec = JSON.parse(readFileSync(ignoreSpecPath, 'utf8'))

  if (existsSync(generatedConfigsDir)) {
    rmSync(generatedConfigsDir, { recursive: true, force: true })
  }
  mkdirSync(generatedConfigsDir, { recursive: true })

  for (const configName of configs) {
    const config = JSON.parse(readFileSync(originalConfigsDir + '/' + configName, 'utf8'))

    for (const spec of config.verify) {
      for (const token of tokens) {
        const specParts = spec.split('/')
        const specName = specParts[specParts.length - 1]
        const contractName = spec.split(':')[0]
        const tokenParts = token.split('/')
        const tokenName = tokenParts[tokenParts.length - 1].split('.')[0]
        const newConfigName = (contractName + '_' + tokenName + '_' + specName.replace('.spec', '.conf'))
        const expectedFileName = newConfigName.replace('.conf', '.json')
        if (ignoreSpec.includes(expectedFileName) && !allSpec) {
          continue
        }

        writeFileSync(`${generatedConfigsDir}/${newConfigName}`, JSON.stringify({
          ...config,
          files: [...config.files, token + ':MockToken'],
          verify: spec,
          expected_file: `${expectedDir}/${expectedFileName}`,
          cache: `nitrogen_${branchName}_${newConfigName}`,
        }))
      }
    }
  }
}

generateConfigs()
