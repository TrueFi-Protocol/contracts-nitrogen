import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import {
  calculateTotalPendingFees,
  getHalfPortfolioDuration,
  getTxTimestamp,
  timeTravelTo,
  startTimeTravelAndClosePortfolio,
  sumArray,
  createAndRegisterInvestment,
  startAndGetTimestamp,
  ONE_DAY_IN_SECONDS,
  calculateTranchesValuesAfterFees,
  getTranchesVirtualTokenBalances,
} from 'utils'
import { MockERC4626Vault__factory } from 'build/types'
import { calculateWaterfallWithoutFees } from 'fixtures/utils'

use(solidity)

const INVESTMENT_DEPOSIT = 4_000_000
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

describe('StructuredIndexedPortfolio.totalAssets.withFees', () => {
  const loadFixture = setupFixtureLoader()

  describe('capital formation', () => {
    it('no deposits', async () => {
      const { portfolio, setProtocolAndTranchesFeeRates, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      expect(await portfolio.totalAssets()).to.eq(Zero)
    })

    it('with deposits', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const depositAmountsSum = depositAmounts.reduce((sum, depositAmount) => sum.add(depositAmount))

      await depositToTranches(portfolio, depositAmounts, wallet)

      expect(await portfolio.totalAssets()).to.eq(depositAmountsSum)
    })
  })

  describe('live', () => {
    it('no deposits, no investment', async () => {
      const { portfolio, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      await portfolio.start()
      expect(await portfolio.totalAssets()).to.eq(Zero)
    })

    it('no deposits, with investment', async () => {
      const { portfolio, parseMockToken, wallet, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const investmentDeposit = parseMockToken(INVESTMENT_DEPOSIT)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(investmentDeposit, portfolio.address)

      await timeTravelTo(investment.createTxTimestamp + timeElapsed)

      const pendingFees = calculateTotalPendingFees([investmentDeposit], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE], timeElapsed)
      const expectedTotalAssets = investmentDeposit.sub(pendingFees)
      expect(await portfolio.totalAssets()).to.eq(expectedTotalAssets)
    })

    it('with deposits, no investment', async () => {
      const { portfolio, depositAndCalculateWaterfallWithoutFees, parseMockToken, wallet, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const depositAmountsSum = depositAmounts.reduce((sum, x) => sum.add(x))

      const waterfall = await depositAndCalculateWaterfallWithoutFees(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      await timeTravelTo(startTxTimestamp + timeElapsed)

      const pendingFees = calculateTotalPendingFees(waterfall, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES, timeElapsed)
      const expectedTotalAssets = depositAmountsSum.sub(pendingFees)
      expect(await portfolio.totalAssets()).to.eq(expectedTotalAssets)
    })

    it('with deposits, with investment', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const investmentDeposit = parseMockToken(INVESTMENT_DEPOSIT)
      await depositToTranches(portfolio, depositAmounts, wallet)
      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(investmentDeposit, portfolio.address)

      await timeTravelTo(investment.createTxTimestamp + timeElapsed)

      const registerTimeElapsed = investment.createTxTimestamp - startTxTimestamp
      const waterfallAfterRegister = await calculateWaterfallWithoutFees(portfolio, depositAmounts, registerTimeElapsed)
      const tranchesValuesAfterFeesAfterRegister = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfallAfterRegister, DEFAULT_PROTOCOL_FEE_RATE, registerTimeElapsed)

      const waterfallAfterInvestment = [tranchesValuesAfterFeesAfterRegister[0].add(investmentDeposit), tranchesValuesAfterFeesAfterRegister[1], tranchesValuesAfterFeesAfterRegister[2]]
      const waterfall = await calculateWaterfallWithoutFees(portfolio, waterfallAfterInvestment, timeElapsed)
      const expectedTranchesValues = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfall, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
      expect(await portfolio.totalAssets()).to.eq(sumArray(expectedTranchesValues))
    })

    it('with deposits, with investment, investment loses value', async () => {
      const { portfolio, setProtocolAndTranchesFeeRates, tranches, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const investmentDeposit = parseMockToken(INVESTMENT_DEPOSIT)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

      await depositToTranches(portfolio, depositAmounts, wallet)
      const startTxTimestamp = await startAndGetTimestamp(portfolio)

      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(investmentDeposit, portfolio.address)
      await investment.setValue(Zero)

      await timeTravelTo(investment.createTxTimestamp + timeElapsed)

      const registerTimeElapsed = investment.createTxTimestamp - startTxTimestamp
      const waterfallAfterRegister = await calculateWaterfallWithoutFees(portfolio, depositAmounts, registerTimeElapsed)
      const tranchesValuesAfterFeesAfterRegister = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfallAfterRegister, DEFAULT_PROTOCOL_FEE_RATE, registerTimeElapsed)

      const waterfall = await calculateWaterfallWithoutFees(portfolio, tranchesValuesAfterFeesAfterRegister, timeElapsed)
      const expectedTranchesValues = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfall, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
      expect(await portfolio.totalAssets()).to.eq(sumArray(expectedTranchesValues))
    })

    it('with deposits, with investment, investment gains value', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const investmentDeposit = parseMockToken(INVESTMENT_DEPOSIT)
      await depositToTranches(portfolio, depositAmounts, wallet)
      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(investmentDeposit, portfolio.address)

      const registerTimeElapsed = investment.createTxTimestamp - startTxTimestamp
      const waterfallAfterRegister = await calculateWaterfallWithoutFees(portfolio, depositAmounts, registerTimeElapsed)
      const tranchesValuesAfterFeesAfterRegister = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfallAfterRegister, DEFAULT_PROTOCOL_FEE_RATE, registerTimeElapsed)

      const newInvestmentValue = investmentDeposit.mul(2)
      await investment.setValue(newInvestmentValue)

      await timeTravelTo(investment.createTxTimestamp + timeElapsed)

      const waterfallAfterInvestment = [tranchesValuesAfterFeesAfterRegister[0].add(newInvestmentValue), tranchesValuesAfterFeesAfterRegister[1], tranchesValuesAfterFeesAfterRegister[2]]
      const waterfall = await calculateWaterfallWithoutFees(portfolio, waterfallAfterInvestment, timeElapsed)
      const expectedTranchesValues = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfall, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
      expect(await portfolio.totalAssets()).to.eq(sumArray(expectedTranchesValues))
    })
  })

  describe('closed', () => {
    it('no deposits', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await startTimeTravelAndClosePortfolio(portfolio)
      expect(await portfolio.totalAssets()).to.eq(Zero)
    })

    it('with deposits', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

      await depositToTranches(portfolio, depositAmounts, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(portfolio)
      const timeElapsedAfterClose = ONE_DAY_IN_SECONDS
      await timeTravelTo(closeTxTimestamp + timeElapsedAfterClose)

      const tranchesVirtualTokenBalances = await getTranchesVirtualTokenBalances(tranches)

      const tranchesZeroFeeRates = [0, 0, 0]
      const waterfall = calculateTranchesValuesAfterFees(
        tranches,
        tranchesZeroFeeRates,
        tranchesVirtualTokenBalances,
        DEFAULT_PROTOCOL_FEE_RATE,
        timeElapsedAfterClose,
      )

      const waterfallSum = sumArray(waterfall)
      expect(await portfolio.totalAssets()).to.eq(waterfallSum)
    })
  })
})
