import { ProtocolConfig, TrancheVault } from 'build/types'
import { setTranchesFeeRates } from 'fixtures/utils'

export async function setTranchesAndProtocolFeeRates(protocolConfig: ProtocolConfig, tranches: TrancheVault[], protocolFeeRate: number, tranchesFeeRates: number[]) {
  await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
  await setTranchesFeeRates(tranches, tranchesFeeRates)
}
