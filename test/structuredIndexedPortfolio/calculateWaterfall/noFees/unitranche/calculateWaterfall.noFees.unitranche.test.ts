import { Zero } from '@ethersproject/constants'
import { MockERC4626Vault__factory } from 'build/types'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  createAndRegisterInvestment,
  getTranchesVirtualTokenBalances,
  ONE_DAY_IN_SECONDS,
  startTimeTravelAndClosePortfolio,
  timeTravelTo,
} from 'utils'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 1_000_000
const INVESTMENT_DEPOSIT_AMOUNT = 1_000

describe('StructuredIndexedPortfolio.calculateWaterfall.noFees.unitranche', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      const waterfall = await unitranchePortfolio.calculateWaterfall()
      expect(waterfall).to.deep.eq([Zero])
    })

    it('live', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await unitranchePortfolio.start()
      const waterfall = await unitranchePortfolio.calculateWaterfall()
      expect(waterfall).to.deep.eq([Zero])
    })

    it('closed', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)

      await startTimeTravelAndClosePortfolio(unitranchePortfolio)

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      expect(waterfall).to.deep.eq([Zero])
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio, approveAndDepositToTranche, parseMockToken, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      expect(waterfall).to.deep.eq([equityDepositAssets])
    })

    it('live', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      await unitranchePortfolio.start()

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      expect(waterfall).to.deep.eq([equityDepositAssets])
    })

    it('live, investment gained value', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const investmentDepositAmount = parseMockToken(INVESTMENT_DEPOSIT_AMOUNT)
      const doubleInvestmentAmount = investmentDepositAmount.mul(2)

      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      await unitranchePortfolio.start()

      const investment = await createAndRegisterInvestment(unitranchePortfolio, wallet, MockERC4626Vault__factory)

      await unitranchePortfolio.executeDeposit(investment.address, investmentDepositAmount)
      await investment.setValue(doubleInvestmentAmount)

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      const expectedUnitrancheValue = equityDepositAssets.add(investmentDepositAmount)
      expect(waterfall).to.deep.eq([expectedUnitrancheValue])
    })

    it('live, investment lost value', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const investmentDepositAmount = parseMockToken(INVESTMENT_DEPOSIT_AMOUNT)
      const halfInvestmentAmount = investmentDepositAmount.div(2)

      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      await unitranchePortfolio.start()

      const investment = await createAndRegisterInvestment(unitranchePortfolio, wallet, MockERC4626Vault__factory)

      await unitranchePortfolio.executeDeposit(investment.address, investmentDepositAmount)
      await investment.setValue(halfInvestmentAmount)

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      const expectedUnitrancheValue = equityDepositAssets.sub(halfInvestmentAmount)
      expect(waterfall).to.deep.eq([expectedUnitrancheValue])
    })

    it('closed', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(unitranchePortfolio)
      await timeTravelTo(closeTxTimestamp + ONE_DAY_IN_SECONDS)

      const waterfall = await unitranchePortfolio.calculateWaterfall()
      const expectedWaterfall = await getTranchesVirtualTokenBalances([unitranche])
      expect(waterfall).to.deep.eq(expectedWaterfall)
    })
  })
})
