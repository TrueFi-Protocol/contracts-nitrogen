import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  ONE_YEAR_IN_SECONDS,
  getHalfPortfolioDuration,
  getTxTimestamp,
  timeTravelTo,
  startTimeTravelAndClosePortfolio,
  percentToBips,
  calculateTotalPendingFees,
  setNextBlockTimestamp,
} from 'utils'

use(solidity)

const DEFAULT_PROTOCOL_FEE_RATE = 400
const EQUITY_FEE_RATE = 100
const JUNIOR_FEE_RATE = 200
const SENIOR_FEE_RATE = 300
const TRANCHES_FEE_RATES = [
  EQUITY_FEE_RATE,
  JUNIOR_FEE_RATE,
  SENIOR_FEE_RATE,
]
const EQUITY_DEPOSIT_ASSETS = 1_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 3_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.liquidAssets.withFees', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })

    it('live', async () => {
      const { portfolio, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      await portfolio.start()
      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })

    it('closed', async () => {
      const { portfolio, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      await startTimeTravelAndClosePortfolio(portfolio)

      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })

    it('live', async () => {
      const { tranches, portfolio, wallet, parseMockToken, depositAndCalculateWaterfallWithoutFees, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const depositAmountsSum = depositAmounts.reduce((sum, amount) => sum.add(amount))
      const waterfall = await depositAndCalculateWaterfallWithoutFees(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      await timeTravelTo(startTxTimestamp + timeElapsed)

      const pendingFees = calculateTotalPendingFees(waterfall, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES, timeElapsed)
      const expectedLiquidAssets = depositAmountsSum.sub(pendingFees)

      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(expectedLiquidAssets)
    })

    it('fee bigger than value', async () => {
      const { tranches, portfolio, wallet, parseMockToken, depositToTranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const maxFeeRate = Math.round(percentToBips(200) * ONE_YEAR_IN_SECONDS / timeElapsed)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, [maxFeeRate, maxFeeRate, maxFeeRate])
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      await timeTravelTo(startTxTimestamp + timeElapsed)

      const liquidAssets = await portfolio.liquidAssets()
      expect(liquidAssets).to.eq(Zero)
    })

    it('closed', async () => {
      const { tranches, portfolio, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
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
