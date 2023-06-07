import { Zero } from '@ethersproject/constants'
import { MockERC4626Vault__factory } from 'build/types'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  calculateTranchesValuesAfterTime,
  createAndRegisterInvestment,
  getHalfPortfolioDuration,
  getTranchesVirtualTokenBalances,
  getTxTimestamp,
  ONE_DAY_IN_SECONDS,
  startAndGetTimestamp,
  startTimeTravelAndClosePortfolio,
  sumArray,
  timeTravelTo,
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

describe('StructuredIndexedPortfolio.calculateWaterfallForTrancheWithoutFee.multitranche', () => {
  const loadFixture = setupFixtureLoader()

  it('index out of bounds', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolio.calculateWaterfallForTrancheWithoutFee(3)).to.be.revertedWith('SIP: Tranche index out of bounds')
  })

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)

      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(Zero)
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(Zero)
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(Zero)
    })

    it('live', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()

      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(Zero)
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(Zero)
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(Zero)
    })

    it('closed', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)

      await startTimeTravelAndClosePortfolio(portfolio)

      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(Zero)
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(Zero)
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(Zero)
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const [equityDeposit, juniorDeposit, seniorDeposit] = depositAmounts
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(equityDeposit)
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(juniorDeposit)
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(seniorDeposit)
    })

    describe('live', () => {
      it('senior underflow, junior empty, equity empty', async () => {
        const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const seniorTrancheDepositAssets = depositAmounts[2]
        await depositToTranches(portfolio, depositAmounts, wallet)

        await portfolio.start()

        const newVirtualTokenBalance = seniorTrancheDepositAssets.sub(1)
        await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(Zero)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(Zero)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(newVirtualTokenBalance)
      })

      it('senior full, junior empty, equity empty', async () => {
        const { portfolio, wallet, depositAndCalculateAssumedTranchesValue, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
        const timeElapsed = await getHalfPortfolioDuration(portfolio)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const [,, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

        const startTx = await portfolio.start()
        const startTxTimestamp = await getTxTimestamp(startTx)

        await portfolio.setVirtualTokenBalance(expectedSeniorTrancheValue)

        await timeTravelTo(startTxTimestamp + timeElapsed)

        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(Zero)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(Zero)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(expectedSeniorTrancheValue)
      })

      it('senior full, junior underflow, equity empty', async () => {
        const { portfolio, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
        const timeElapsed = await getHalfPortfolioDuration(portfolio)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const [,, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)
        const expectedJuniorTrancheValue = parseMockToken(500_000)

        const startTx = await portfolio.start()
        const startTxTimestamp = await getTxTimestamp(startTx)

        const newVirtualTokenBalance = expectedJuniorTrancheValue.add(expectedSeniorTrancheValue)
        await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

        await timeTravelTo(startTxTimestamp + timeElapsed)

        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(Zero)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(expectedJuniorTrancheValue)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(expectedSeniorTrancheValue)
      })

      it('senior full, junior full, equity empty', async () => {
        const { portfolio, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
        const timeElapsed = await getHalfPortfolioDuration(portfolio)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

        const startTx = await portfolio.start()
        const startTxTimestamp = await getTxTimestamp(startTx)

        const newVirtualTokenBalance = expectedJuniorTrancheValue.add(expectedSeniorTrancheValue)
        await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

        await timeTravelTo(startTxTimestamp + timeElapsed)

        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(Zero)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(expectedJuniorTrancheValue)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(expectedSeniorTrancheValue)
      })

      it('senior full, junior full, equity surplus', async () => {
        const { portfolio, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
        const timeElapsed = await getHalfPortfolioDuration(portfolio)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)
        const expectedEquityTrancheValue = parseMockToken(500_000)

        const startTx = await portfolio.start()
        const startTxTimestamp = await getTxTimestamp(startTx)

        const newVirtualTokenBalance = expectedEquityTrancheValue.add(expectedJuniorTrancheValue).add(expectedSeniorTrancheValue)
        await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

        await timeTravelTo(startTxTimestamp + timeElapsed)

        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(expectedEquityTrancheValue)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(expectedJuniorTrancheValue)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(expectedSeniorTrancheValue)
      })

      it('investment gained value', async () => {
        const { portfolio, parseMockToken, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const investmentDepositAmount = depositAmounts[0]
        const doubleInvestmentAmount = investmentDepositAmount.mul(2)

        await depositToTranches(portfolio, depositAmounts, wallet)

        const startTxTimestamp = await startAndGetTimestamp(portfolio)
        const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
        const depositTx = await portfolio.executeDeposit(investment.address, investmentDepositAmount)
        const increaseValueTx = await investment.setValue(doubleInvestmentAmount)

        const depositTxTimestamp = await getTxTimestamp(depositTx)
        const increaseValueTxTimestamp = await getTxTimestamp(increaseValueTx)

        const registerTimeElapsed = investment.createTxTimestamp - startTxTimestamp
        const depositTimeElapsed = depositTxTimestamp - investment.createTxTimestamp
        const increaseValueTimeElapsed = increaseValueTxTimestamp - depositTxTimestamp

        const tranchesValuesAfterRegister = await calculateTranchesValuesAfterTime(portfolio, depositAmounts, registerTimeElapsed)
        const tranchesValuesAfterDeposit = await calculateTranchesValuesAfterTime(portfolio, tranchesValuesAfterRegister, depositTimeElapsed)
        const portfolioValueAfterIncrease = sumArray(tranchesValuesAfterDeposit).add(investmentDepositAmount)
        const [expectedEquityTrancheValue, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await calculateTranchesValuesAfterTime(portfolio, tranchesValuesAfterDeposit, increaseValueTimeElapsed, portfolioValueAfterIncrease)

        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(expectedEquityTrancheValue)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(expectedJuniorTrancheValue)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(expectedSeniorTrancheValue)
      })

      it('investment lost value', async () => {
        const { portfolio, parseMockToken, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const investmentDepositAmount = depositAmounts[0]
        const halfInvestmentAmount = investmentDepositAmount.div(2)

        await depositToTranches(portfolio, depositAmounts, wallet)

        const startTxTimestamp = await startAndGetTimestamp(portfolio)
        const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
        const depositTx = await portfolio.executeDeposit(investment.address, investmentDepositAmount)
        const increaseValueTx = await investment.setValue(halfInvestmentAmount)

        const depositTxTimestamp = await getTxTimestamp(depositTx)
        const increaseValueTxTimestamp = await getTxTimestamp(increaseValueTx)

        const registerTimeElapsed = investment.createTxTimestamp - startTxTimestamp
        const depositTimeElapsed = depositTxTimestamp - investment.createTxTimestamp
        const increaseValueTimeElapsed = increaseValueTxTimestamp - depositTxTimestamp

        const tranchesValuesAfterRegister = await calculateTranchesValuesAfterTime(portfolio, depositAmounts, registerTimeElapsed)
        const tranchesValuesAfterDeposit = await calculateTranchesValuesAfterTime(portfolio, tranchesValuesAfterRegister, depositTimeElapsed)
        const portfolioValueAfterIncrease = sumArray(tranchesValuesAfterDeposit).sub(halfInvestmentAmount)
        const [expectedEquityTrancheValue, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await calculateTranchesValuesAfterTime(portfolio, tranchesValuesAfterDeposit, increaseValueTimeElapsed, portfolioValueAfterIncrease)

        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(expectedEquityTrancheValue)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(expectedJuniorTrancheValue)
        expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(expectedSeniorTrancheValue)
      })
    })

    it('closed', async () => {
      const { portfolio, depositToTranches, wallet, parseMockToken, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(portfolio)
      await timeTravelTo(closeTxTimestamp + ONE_DAY_IN_SECONDS)

      const tranchesVirtualTokenBalances = await getTranchesVirtualTokenBalances(tranches)

      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(0)).to.eq(tranchesVirtualTokenBalances[0])
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(1)).to.eq(tranchesVirtualTokenBalances[1])
      expect(await portfolio.calculateWaterfallForTrancheWithoutFee(2)).to.eq(tranchesVirtualTokenBalances[2])
    })
  })
})
