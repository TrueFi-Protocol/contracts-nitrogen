import { JsonRpcProvider } from '@ethersproject/providers'
import { defaultAccounts } from 'ethereum-waffle'

import { deployNitrogenPlayground } from './deploy'

export interface PlaygroundOptions {
  privateKey: string,
  provider: JsonRpcProvider,
  deploymentsFile: string,
}

export async function runNitrogen(provider: JsonRpcProvider, deploymentsFile: string) {
  const { secretKey: privateKey } = defaultAccounts[0]
  await deployNitrogenPlayground({ privateKey, provider, deploymentsFile })
  console.log('\nNitrogen succesfully deployed 🌟')
}
