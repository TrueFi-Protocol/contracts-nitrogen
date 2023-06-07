import { Wallet } from 'ethers'

import { DepositController, MockToken, ProtocolConfig, TransferController, WithdrawController } from 'build/types'
import { TranchesDeployParams } from 'fixtures/types'

interface Controllers {
  depositController: DepositController,
  transferController: TransferController,
  withdrawController: WithdrawController,
}

export function getTrancheDeployParams(
  wallet: Wallet,
  token: MockToken,
  protocolConfig: ProtocolConfig,
  controllers: Controllers,
): TranchesDeployParams {
  return {
    managerAddress: wallet.address,
    assetAddress: token.address,
    protocolConfigAddress: protocolConfig.address,
    depositControllerAddress: controllers.depositController.address,
    transferControllerAddress: controllers.transferController.address,
    withdrawControllerAddress: controllers.withdrawController.address,
    waterfallIndex: 0,
    managerFeeRate: 0,
  }
}
