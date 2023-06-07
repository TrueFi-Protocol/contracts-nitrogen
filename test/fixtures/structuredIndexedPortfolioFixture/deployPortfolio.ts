import { MockToken, StructuredIndexedPortfolioFactory } from 'build/types'
import { Wallet } from 'ethers'
import { Controllers, TranchesConfig } from 'fixtures/types'
import { getControllersFromTranches, getDefaultExpectedEquityRate, getDefaultPortfolioParams, getPortfolioFromCreationTx, getTranchesFromPortfolio, getTranchesInitData } from 'fixtures/utils'
import { TRANCHES_CONFIG, UNITRANCHE_CONFIG } from './fixtureConfig'

export function deployMultitranchePortfolio(wallet: Wallet, portfolioFactory: StructuredIndexedPortfolioFactory, token: MockToken, controllersImplementations: Controllers) {
  return deployPortfolio(wallet, portfolioFactory, token, controllersImplementations, TRANCHES_CONFIG)
}

export async function deployUnitranchePortfolio(wallet: Wallet, portfolioFactory: StructuredIndexedPortfolioFactory, token: MockToken, controllersImplementations: Controllers) {
  const { portfolio, tranches, tranchesInitData, portfolioCreationTx, tranchesControllers, expectedEquityRate } = await deployPortfolio(wallet, portfolioFactory, token, controllersImplementations, UNITRANCHE_CONFIG)
  return {
    unitranchePortfolio: portfolio,
    unitranche: tranches[0],
    unitrancheInitData: tranchesInitData[0],
    unitranchePortfolioCreationTx: portfolioCreationTx,
    unitrancheControllers: tranchesControllers[0],
    unitrancheExpectedEquityRate: expectedEquityRate,
  }
}

export async function deployPortfolio(wallet: Wallet, portfolioFactory: StructuredIndexedPortfolioFactory, token: MockToken, controllersImplementations: Controllers, tranchesConfig: TranchesConfig) {
  const tranchesInitData = getTranchesInitData(tranchesConfig, controllersImplementations, wallet)
  const portfolioParams = getDefaultPortfolioParams()
  const expectedEquityRate = getDefaultExpectedEquityRate()
  const portfolioCreationTx = await portfolioFactory.createPortfolio(token.address, portfolioParams, tranchesInitData, expectedEquityRate)

  const portfolio = await getPortfolioFromCreationTx(wallet, portfolioCreationTx, portfolioFactory.address)
  const tranches = await getTranchesFromPortfolio(portfolio, wallet)
  const tranchesControllers = await getControllersFromTranches(tranches, wallet)

  const managerFeeBeneficiary = Wallet.createRandom()
  for (const tranche of tranches) {
    await tranche.setManagerFeeBeneficiary(managerFeeBeneficiary.address)
  }

  return {
    portfolio,
    tranches,
    tranchesCount: tranchesInitData.length,
    tranchesInitData,
    portfolioCreationTx,
    tranchesControllers,
    portfolioParams,
    expectedEquityRate,
    managerFeeBeneficiary,
  }
}
