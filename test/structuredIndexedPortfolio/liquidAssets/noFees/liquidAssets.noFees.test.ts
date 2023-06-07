import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  getHalfPortfolioDuration,
  getTxTimestamp,
  timeTravelTo,
  startTimeTravelAndClosePortfolio,
  setNextBlockTimestamp,
} from 'utils'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 1_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 3_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.liquidAssets.noFees', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })

    it('live', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })

    it('closed', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await startTimeTravelAndClosePortfolio(portfolio)

      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })

    it('live', async () => {
      const { portfolio, wallet, parseMockToken, depositAndCalculateWaterfallWithoutFees } = await loadFixture(structuredIndexedPortfolioFixture)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const waterfall = await depositAndCalculateWaterfallWithoutFees(depositAmounts, wallet, timeElapsed)
      const waterfallSum = waterfall.reduce((sum, value) => sum.add(value))

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      await timeTravelTo(startTxTimestamp + timeElapsed)

      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(waterfallSum)
    })

    it('closed', async () => {
      const { portfolio, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const [, assumedJuniorTrancheValue, assumedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)
      const assumedEquityTrancheValue = parseMockToken(500_000)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const newVirtualTokenBalance = assumedEquityTrancheValue.add(assumedJuniorTrancheValue).add(assumedSeniorTrancheValue)
      await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

      await setNextBlockTimestamp(startTxTimestamp + timeElapsed + 1)
      await portfolio.close()

      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })
  })
})
