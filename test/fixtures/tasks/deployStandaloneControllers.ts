import { Wallet } from 'ethers'

import {
  AllowAllLenderVerifier__factory,
  DepositController__factory,
  TransferController__factory,
  WithdrawController__factory,
} from 'build/types'
import { Controllers } from 'fixtures/types'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { MaxUint256 } from '@ethersproject/constants'

export async function deployStandaloneControllers(wallet: Wallet, managerAddress: string): Promise<Controllers> {
  const allowAllLenderVerifier = await new AllowAllLenderVerifier__factory(wallet).deploy()

  const depositController = await deployBehindProxy(
    new DepositController__factory(wallet),
    managerAddress,
    allowAllLenderVerifier.address,
    0,
    MaxUint256,
  )

  const withdrawController = await deployBehindProxy(
    new WithdrawController__factory(wallet),
    managerAddress,
    0,
    0,
  )

  const transferController = await deployBehindProxy(
    new TransferController__factory(wallet),
    managerAddress,
  )

  return { depositController, withdrawController, transferController, allowAllLenderVerifier }
}
