import { DepositController, DepositController__factory, TrancheVault, TransferController, TransferController__factory, WithdrawController, WithdrawController__factory } from 'contracts'
import { Wallet } from 'ethers'

type TrancheControllers = {
  depositController: DepositController,
  withdrawController: WithdrawController,
  transferController: TransferController,
}

export async function getControllersFromTranches(tranches: TrancheVault[], wallet: Wallet): Promise<TrancheControllers[]> {
  const trancheControllers: TrancheControllers[] = []

  for (let i = 0; i < tranches.length; i++) {
    const tranche = tranches[i]

    const depositControllerAddress = await tranche.depositController()
    const withdrawControllerAddress = await tranche.withdrawController()
    const transferControllerAddress = await tranche.transferController()

    const depositController = DepositController__factory.connect(depositControllerAddress, wallet)
    const withdrawController = WithdrawController__factory.connect(withdrawControllerAddress, wallet)
    const transferController = TransferController__factory.connect(transferControllerAddress, wallet)

    trancheControllers.push({ depositController, withdrawController, transferController })
  }
  return trancheControllers
}
