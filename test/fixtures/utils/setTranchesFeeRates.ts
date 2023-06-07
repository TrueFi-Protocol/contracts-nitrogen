import { TrancheVault } from 'contracts'

export async function setTranchesFeeRates(tranches: TrancheVault[], feeRates: number[]) {
  for (let i = 0; i < tranches.length; i++) {
    await tranches[i].setManagerFeeRate(feeRates[i])
  }
}
