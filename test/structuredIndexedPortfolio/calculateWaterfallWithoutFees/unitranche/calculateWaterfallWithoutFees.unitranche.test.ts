import { Zero } from '@ethersproject/constants'
import { MockERC4626Vault__factory } from 'build/types'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_DAY_IN_SECONDS, createAndRegisterInvestment, startTimeTravelAndClosePortfolio, timeTravelTo } from 'utils'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 1_000_000

describe('StructuredIndexedPortfolio.calculateWaterfallWithoutFees.unitranche', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      const waterfall = await unitranchePortfolio.calculateWaterfallWithoutFees()
      expect(waterfall).to.deep.eq([Zero])
    })

    it('live', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await unitranchePortfolio.start()
      const waterfall = await unitranchePortfolio.calculateWaterfallWithoutFees()
      expect(waterfall).to.deep.eq([Zero])
    })

    it('closed', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)

      await startTimeTravelAndClosePortfolio(unitranchePortfolio)

      const waterfall = await unitranchePortfolio.calculateWaterfallWithoutFees()
      expect(waterfall).to.deep.eq([Zero])
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio, approveAndDepositToTranche, parseMockToken, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const waterfall = await unitranchePortfolio.calculateWaterfallWithoutFees()
      expect(waterfall).to.deep.eq([equityDepositAssets])
    })

    it('live', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      await unitranchePortfolio.start()

      const waterfall = await unitranchePortfolio.calculateWaterfallWithoutFees()
      expect(waterfall).to.deep.eq([equityDepositAssets])
    })

    it('live, investment gained value', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const investmentDepositAmount = equityDepositAssets.div(2)
      const doubleInvestmentAmount = investmentDepositAmount.mul(2)

      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      await unitranchePortfolio.start()

      const investment = await createAndRegisterInvestment(unitranchePortfolio, wallet, MockERC4626Vault__factory)

      await unitranchePortfolio.executeDeposit(investment.address, investmentDepositAmount)
      await investment.setValue(doubleInvestmentAmount)

      const expectedUnitrancheValue = equityDepositAssets.add(investmentDepositAmount)
      expect(await unitranchePortfolio.calculateWaterfallWithoutFees()).to.deep.eq([expectedUnitrancheValue])
    })

    it('live, investment lost value', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      const investmentDepositAmount = equityDepositAssets.div(2)
      const halfInvestmentAmount = investmentDepositAmount.div(2)

      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      await unitranchePortfolio.start()

      const investment = await createAndRegisterInvestment(unitranchePortfolio, wallet, MockERC4626Vault__factory)

      await unitranchePortfolio.executeDeposit(investment.address, investmentDepositAmount)
      await investment.setValue(halfInvestmentAmount)

      const expectedUnitrancheValue = equityDepositAssets.sub(halfInvestmentAmount)
      expect(await unitranchePortfolio.calculateWaterfallWithoutFees()).to.deep.eq([expectedUnitrancheValue])
    })

    it('closed', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(unitranchePortfolio)
      await timeTravelTo(closeTxTimestamp + ONE_DAY_IN_SECONDS)

      const equityTrancheVirtualTokenBalance = await unitranche.virtualTokenBalance()

      const waterfall = await unitranchePortfolio.calculateWaterfallWithoutFees()
      expect(waterfall).to.deep.eq([equityTrancheVirtualTokenBalance])
    })
  })
})
