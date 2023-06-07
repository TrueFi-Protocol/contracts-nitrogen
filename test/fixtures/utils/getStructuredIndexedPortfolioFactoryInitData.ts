import { BigNumber, Wallet } from 'ethers'
import {
  Controllers,
  TranchesConfig,
  TranchesControllersConfig, TrancheInitData,
} from 'fixtures/types'

export function getTranchesInitData(config: TranchesConfig, controllers: Controllers, wallet: Wallet) {
  const { depositControllersCeilings, withdrawControllerFloors } = config.controllers
  const { names, symbols, targetAPYs, minSubordinateRatios, managerFeeRates } = config.tranches

  const { getDepositControllerInitData, getWithdrawControllerInitData, getTransferControllerInitData } = createGetControllersInitData(config.controllers, wallet, controllers)

  const getTrancheInitData = (index: number): TrancheInitData => ({
    name: names[index],
    symbol: symbols[index],
    targetApy: targetAPYs[index],
    minSubordinateRatio: minSubordinateRatios[index],
    managerFeeRate: managerFeeRates[index],
    depositControllerImplementation: controllers.depositController.address,
    depositControllerInitData: getDepositControllerInitData(depositControllersCeilings[index]),
    withdrawControllerImplementation: controllers.withdrawController.address,
    withdrawControllerInitData: getWithdrawControllerInitData(withdrawControllerFloors[index]),
    transferControllerImplementation: controllers.transferController.address,
    transferControllerInitData: getTransferControllerInitData(),
  })

  return [...Array(names.length)].map((_, index) => getTrancheInitData(index))
}

function createGetControllersInitData(config: TranchesControllersConfig, wallet: Wallet, controllers: Controllers) {
  const { depositControllerFeeRate, withdrawControllerFeeRate } = config

  const { depositController, withdrawController, transferController, allowAllLenderVerifier } = controllers

  const getDepositControllerInitData = (depositControllerCeiling: BigNumber) => depositController.interface.encodeFunctionData('initialize', [wallet.address, allowAllLenderVerifier.address, depositControllerFeeRate, depositControllerCeiling])
  const getWithdrawControllerInitData = (withdrawControllerFloor: BigNumber) => withdrawController.interface.encodeFunctionData('initialize', [wallet.address, withdrawControllerFeeRate, withdrawControllerFloor])
  const getTransferControllerInitData = () => transferController.interface.encodeFunctionData('initialize', [wallet.address])

  return { getDepositControllerInitData, getWithdrawControllerInitData, getTransferControllerInitData }
}
