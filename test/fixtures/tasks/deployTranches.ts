import { Wallet } from 'ethers'

import { TrancheVault, TrancheVault__factory } from 'build/types'
import { TranchesDeployParams } from 'fixtures/types'
import { deployBehindProxy } from 'utils/deployBehindProxy'

type TrancheInitData = {
  tranche: string,
  minSubordinateRatio: number,
  targetApy: number,
}

type TrancheRatioApy = {
  minSubordinateRatio: number,
  targetApy: number,
}

export async function deployTranches(wallet: Wallet, tranchesDeployParams: TranchesDeployParams, ratios: TrancheRatioApy[]) {
  const tranches: TrancheVault[] = []
  const tranchesInitData: TrancheInitData[] = []

  for (let i = 0; i < ratios.length; i++) {
    tranches.push(await deployBehindProxy(
      new TrancheVault__factory(wallet),
      `Tranche ${i}`,
      `TR${i}`,
      tranchesDeployParams.assetAddress,
      tranchesDeployParams.depositControllerAddress,
      tranchesDeployParams.withdrawControllerAddress,
      tranchesDeployParams.transferControllerAddress,
      tranchesDeployParams.protocolConfigAddress,
      i,
      tranchesDeployParams.managerAddress,
      tranchesDeployParams.managerFeeRate,
    ))
    tranchesInitData.push({ tranche: tranches[i].address, ...ratios[i] })
  }

  return { tranches, tranchesInitData, tranchesCount: ratios.length }
}
