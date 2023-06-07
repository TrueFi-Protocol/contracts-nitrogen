import { Zero } from '@ethersproject/constants'
import { MockERC4626Vault__factory } from 'build/types'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  ONE_DAY_IN_SECONDS,
  createAndRegisterInvestment,
  startTimeTravelAndClosePortfolio,
  timeTravelTo,
} from 'utils'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 1_000_000

describe('StructuredIndexedPortfolio.calculateWaterfallForTranche.noFees.unitranche', () => {
  const loadFixture = setupFixtureLoader()

  it('index out of bounds', async () => {
    const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(unitranchePortfolio.calculateWaterfallForTranche(1)).to.be.revertedWith('SIP: Tranche index out of bounds')
  })

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      expect(await unitranchePortfolio.calculateWaterfallForTranche(0)).to.eq(Zero)
    })

    it('live', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await unitranchePortfolio.start()

      expect(await unitranchePortfolio.calculateWaterfallForTranche(0)).to.eq(Zero)
    })

    it('closed', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await startTimeTravelAndClosePortfolio(unitranchePortfolio)

      expect(await unitranchePortfolio.calculateWaterfallForTranche(0)).to.eq(Zero)
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio, approveAndDepositToTranche, parseMockToken, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      expect(await unitranchePortfolio.calculateWaterfallForTranche(0)).to.eq(equityDepositAssets)
    })

    it('live', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      await unitranchePortfolio.start()

      expect(await unitranchePortfolio.calculateWaterfallForTranche(0)).to.eq(equityDepositAssets)
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
      expect(await unitranchePortfolio.calculateWaterfallForTranche(0)).to.eq(expectedUnitrancheValue)
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
      expect(await unitranchePortfolio.calculateWaterfallForTranche(0)).to.eq(expectedUnitrancheValue)
    })

    it('closed', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(unitranchePortfolio)
      await timeTravelTo(closeTxTimestamp + ONE_DAY_IN_SECONDS)

      const equityTrancheVirtualTokenBalance = await unitranche.virtualTokenBalance()

      expect(await unitranchePortfolio.calculateWaterfallForTranche(0)).to.eq(equityTrancheVirtualTokenBalance)
    })
  })
})
