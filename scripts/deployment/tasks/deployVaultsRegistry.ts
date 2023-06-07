import { contract } from 'ethereum-mars'

import { encodeInitializeCall, proxy } from '../utils'
import { VaultsRegistry } from '../../../build/artifacts'
import { VaultsRegistry__factory } from '../../../build/types'

export function deployVaultsRegistry() {
  const vaultsRegistryImplementation = contract(VaultsRegistry)
  const initializeCallData = encodeInitializeCall(VaultsRegistry__factory)
  return proxy(vaultsRegistryImplementation, initializeCallData)
}
