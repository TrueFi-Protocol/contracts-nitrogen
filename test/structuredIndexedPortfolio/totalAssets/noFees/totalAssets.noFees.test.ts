import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { startTimeTravelAndClosePortfolio } from 'utils/startTimeTravelAndClosePortfolio'
import { MockERC4626Vault__factory } from 'build/types'
import {
  sumArray,
  createAndRegisterInvestment,
  ONE_DAY_IN_SECONDS,
  timeTravelTo,
  getTranchesVirtualTokenBalances,
} from 'utils'

use(solidity)

const INVESTMENT_DEPOSIT = 100_000
const EQUITY_DEPOSIT_ASSETS = 1_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 3_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.totalAssets.noFees', () => {
  const loadFixture = setupFixtureLoader()

  describe('capital formation', () => {
    it('no deposits', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      expect(await portfolio.totalAssets()).to.eq(Zero)
    })

    it('with deposits', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const depositAmountsSum = depositAmounts.reduce((sum, depositAmount) => sum.add(depositAmount))

      await depositToTranches(portfolio, depositAmounts, wallet)

      expect(await portfolio.totalAssets()).to.eq(depositAmountsSum)
    })
  })

  describe('live', () => {
    it('no deposits, no investment', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      expect(await portfolio.totalAssets()).to.eq(Zero)
    })

    it('no deposits, with investment', async () => {
      const { portfolio, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
      const investmentDeposit = parseMockToken(INVESTMENT_DEPOSIT)

      await portfolio.start()
      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(investmentDeposit, portfolio.address)

      expect(await portfolio.totalAssets()).to.eq(investmentDeposit)
    })

    it('with deposits, no investment', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const depositAmountsSum = sumArray(depositAmounts)

      await depositToTranches(portfolio, depositAmounts, wallet)
      await portfolio.start()

      expect(await portfolio.totalAssets()).to.eq(depositAmountsSum)
    })

    it('with deposits, with investments', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const investmentDeposit = parseMockToken(INVESTMENT_DEPOSIT)

      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const depositAmountsSum = sumArray(depositAmounts)

      await depositToTranches(portfolio, depositAmounts, wallet)
      await portfolio.start()

      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(investmentDeposit, portfolio.address)

      const expectedTotalAssets = investmentDeposit.add(depositAmountsSum)
      expect(await portfolio.totalAssets()).to.eq(expectedTotalAssets)
    })

    it('with deposits, with investment, investment losses value', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const investmentDeposit = parseMockToken(INVESTMENT_DEPOSIT)

      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const depositAmountsSum = sumArray(depositAmounts)

      await depositToTranches(portfolio, depositAmounts, wallet)
      await portfolio.start()

      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(investmentDeposit, portfolio.address)

      await investment.setValue(Zero)

      expect(await portfolio.totalAssets()).to.eq(depositAmountsSum)
    })

    it('with deposits, with investment, investment gains value', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const investmentDeposit = parseMockToken(INVESTMENT_DEPOSIT)

      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

      await depositToTranches(portfolio, depositAmounts, wallet)
      await portfolio.start()

      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(investmentDeposit, portfolio.address)

      const newInvestmentValue = investmentDeposit.mul(2)
      await investment.setValue(newInvestmentValue)

      const expectedTotalAssets = sumArray(depositAmounts).add(newInvestmentValue)
      expect(await portfolio.totalAssets()).to.eq(expectedTotalAssets)
    })
  })

  describe('closed', () => {
    it('no deposits', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(portfolio)
      await timeTravelTo(closeTxTimestamp + ONE_DAY_IN_SECONDS)
      expect(await portfolio.totalAssets()).to.eq(Zero)
    })

    it('with deposits', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(portfolio)
      await timeTravelTo(closeTxTimestamp + ONE_DAY_IN_SECONDS)

      const tranchesVirtualTokenBalances = await getTranchesVirtualTokenBalances(tranches)
      const expectedTotalAssets = sumArray(tranchesVirtualTokenBalances)
      expect(await portfolio.totalAssets()).to.eq(expectedTotalAssets)
    })
  })
})
