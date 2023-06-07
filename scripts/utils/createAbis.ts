import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { utils } from 'ethers'
import { safeReadJsonFile } from './safeReadJsonFile'

const BUILD_FOLDER = './build'
const ABIS_FOLDER = './abis'
const isUpperCase = (char: string) => char === char.toUpperCase()

function camelCaseToScreamingSnakeCase(text: string) {
  let returnString = ''
  text.split('').forEach((char, idx, arr) => {
    const shouldUnderscore = isUpperCase(char) && !isUpperCase(arr[idx + 1] ?? '') && idx !== 0
    returnString += shouldUnderscore ? `_${char}` : char
  })
  return returnString.toUpperCase()
}

function jsonAbiToTypescript(jsonAbi: any | undefined, contractName: string) {
  if (!jsonAbi) return ''
  const formattedInterface = new utils.Interface(jsonAbi).format()
  if (!formattedInterface || !Array.isArray(formattedInterface)) return ''

  let fileBody = `export const ${camelCaseToScreamingSnakeCase(contractName)}_ABI = [\n`
  formattedInterface.forEach(func => {
    fileBody += `'${func}',\n`
  })
  fileBody += '] as const'
  return fileBody
}

const jsonFiles = readdirSync(BUILD_FOLDER).filter(fileName => fileName.endsWith('.json'))

jsonFiles.forEach((jsonFile) => {
  const contractName = jsonFile.substring(0, jsonFile.length - 5)
  const jsonAbi = safeReadJsonFile(`${BUILD_FOLDER}/${jsonFile}`)?.['abi']
  const fileBody = jsonAbiToTypescript(jsonAbi, contractName)

  if (fileBody === '') {
    console.log(`Could not create abi from ${jsonFile}`)
    return
  }

  if (!existsSync(ABIS_FOLDER)) mkdirSync(ABIS_FOLDER)
  writeFileSync(`${ABIS_FOLDER}/${contractName}.ts`, fileBody)
})
