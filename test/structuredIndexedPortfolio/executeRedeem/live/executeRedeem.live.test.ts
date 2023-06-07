import { expect, use } from 'chai'
import { MockERC4626Vault__factory } from 'contracts'
import { solidity } from 'ethereum-waffle'
import { calculateWaterfallWithoutFees } from 'fixtures/utils'
import { describe, it } from 'mocha'

import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  calculateTranchesValuesAfterFees,
  createAndRegisterInvestment,
  getHalfPortfolioDuration,
  getTxTimestamp, setNextBlockTimestamp, sumArray,
} from 'utils'

use(solidity)

const PREVIEW_REDEEM_FLAT_FEE = 5
const ARBITRARY_DEPOSIT_AMOUNT = 1
const INVESTMENT_DEPOSIT_AMOUNT = 1_000_000

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

describe('StructuredIndexedPortfolio.executeRedeem.live', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { portfolio, other, mockErc4626Vault } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolio.connect(other).executeRedeem(mockErc4626Vault.address, ARBITRARY_DEPOSIT_AMOUNT))
      .to.be.revertedWith('SIP: Only manager')
  })

  it('investment not registered', async () => {
    const { portfolio, mockErc4626Vault } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolio.executeRedeem(mockErc4626Vault.address, ARBITRARY_DEPOSIT_AMOUNT))
      .to.be.revertedWith('SIP: Investment not registered')
  })

  it('returns assets', async () => {
    const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const investmentDepositAmount = parseMockToken(INVESTMENT_DEPOSIT_AMOUNT)

    await portfolio.start()

    const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
    await investment.approveAndDeposit(investmentDepositAmount, portfolio.address)

    const shares = await investment.convertToShares(investmentDepositAmount)
    const assets = await portfolio.callStatic.executeRedeem(investment.address, shares)
    expect(assets).to.eq(investmentDepositAmount)
  })

  it('virtual token balance increases', async () => {
    const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const investmentDepositAmount = parseMockToken(INVESTMENT_DEPOSIT_AMOUNT)

    await portfolio.start()

    const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
    await investment.approveAndDeposit(investmentDepositAmount, portfolio.address)

    const virtualTokenBalanceBefore = await portfolio.virtualTokenBalance()

    const shares = await investment.convertToShares(investmentDepositAmount)
    const assets = await portfolio.callStatic.executeRedeem(investment.address, shares)
    await portfolio.executeRedeem(investment.address, shares)

    const virtualTokenBalanceAfter = await portfolio.virtualTokenBalance()

    const expectedVirtualTokenBalance = virtualTokenBalanceBefore.add(assets)
    expect(virtualTokenBalanceAfter).to.eq(expectedVirtualTokenBalance)
  })

  it('redeem called on ERC4626 vault', async () => {
    const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const investmentDepositAmount = parseMockToken(INVESTMENT_DEPOSIT_AMOUNT)

    await portfolio.start()

    const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
    await investment.approveAndDeposit(investmentDepositAmount, portfolio.address)

    const shares = await investment.convertToShares(investmentDepositAmount)
    await portfolio.executeRedeem(investment.address, shares)
    expect('redeem').to.be.calledOnContractWith(investment, [shares, portfolio.address, portfolio.address])
  })

  describe('with fees', () => {
    it('with previewRedeemFlatFee', async () => {
      const { portfolio, parseMockToken, tranches, setProtocolAndTranchesFeeRates, wallet, depositToTranches } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

      const investmentDepositAmount = parseMockToken(INVESTMENT_DEPOSIT_AMOUNT)

      await depositToTranches(portfolio, depositAmounts, wallet)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      const previewRedeemFlatFee = parseMockToken(PREVIEW_REDEEM_FLAT_FEE)
      await investment.setPreviewRedeemFlatFee(previewRedeemFlatFee)
      await investment.approveAndDeposit(investmentDepositAmount, portfolio.address)

      const registerTimeElapsed = investment.createTxTimestamp - startTxTimestamp
      const waterfallAfterRegister = await calculateWaterfallWithoutFees(portfolio, depositAmounts, registerTimeElapsed)
      const tranchesValuesAfterRegister = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfallAfterRegister, DEFAULT_PROTOCOL_FEE_RATE, registerTimeElapsed)

      const totalAmount = sumArray(tranchesValuesAfterRegister).add(investmentDepositAmount).sub(previewRedeemFlatFee)
      const waterfall = await calculateWaterfallWithoutFees(portfolio, tranchesValuesAfterRegister, timeElapsed, totalAmount)
      const tranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfall, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
      const tranchesValuesAfterFeesSum = sumArray(tranchesValuesAfterFees)

      await setNextBlockTimestamp(investment.createTxTimestamp + timeElapsed)
      const shares = await investment.convertToShares(investmentDepositAmount)
      await portfolio.executeRedeem(investment.address, shares)

      const portfolioTotalAssets = await portfolio.totalAssets()
      const expectedPortfolioTotalAssets = tranchesValuesAfterFeesSum.add(previewRedeemFlatFee)
      expect(portfolioTotalAssets).to.eq(expectedPortfolioTotalAssets)
    })

    it('without previewRedeemFlatFee', async () => {
      const { portfolio, parseMockToken, tranches, setProtocolAndTranchesFeeRates, wallet, depositToTranches } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

      const investmentDepositAmount = parseMockToken(INVESTMENT_DEPOSIT_AMOUNT)

      await depositToTranches(portfolio, depositAmounts, wallet)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await investment.approveAndDeposit(investmentDepositAmount, portfolio.address)

      const registerTimeElapsed = investment.createTxTimestamp - startTxTimestamp
      const waterfallAfterRegister = await calculateWaterfallWithoutFees(portfolio, depositAmounts, registerTimeElapsed)
      const tranchesValuesAfterRegister = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfallAfterRegister, DEFAULT_PROTOCOL_FEE_RATE, registerTimeElapsed)

      const totalAmount = sumArray(tranchesValuesAfterRegister).add(investmentDepositAmount)
      const waterfall = await calculateWaterfallWithoutFees(portfolio, tranchesValuesAfterRegister, timeElapsed, totalAmount)
      const tranchesValuesAfterFees = calculateTranchesValuesAfterFees(tranches, TRANCHES_FEE_RATES, waterfall, DEFAULT_PROTOCOL_FEE_RATE, timeElapsed)
      const tranchesValuesAfterFeesSum = sumArray(tranchesValuesAfterFees)

      await setNextBlockTimestamp(investment.createTxTimestamp + timeElapsed)
      const shares = await investment.convertToShares(investmentDepositAmount)
      await portfolio.executeRedeem(investment.address, shares)

      const portfolioTotalAssets = await portfolio.totalAssets()
      expect(portfolioTotalAssets).to.eq(tranchesValuesAfterFeesSum)
    })
  })

  it('no fees', async () => {
    const { portfolio, parseMockToken, wallet, depositToTranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getHalfPortfolioDuration(portfolio)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    const depositAmountsSum = sumArray(depositAmounts)

    const investmentDepositAmount = parseMockToken(INVESTMENT_DEPOSIT_AMOUNT)

    await depositToTranches(portfolio, depositAmounts, wallet)

    const startTx = await portfolio.start()
    const startTxTimestamp = await getTxTimestamp(startTx)

    const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
    const previewRedeemFlatFee = parseMockToken(PREVIEW_REDEEM_FLAT_FEE)
    await investment.setPreviewRedeemFlatFee(previewRedeemFlatFee)
    await investment.approveAndDeposit(investmentDepositAmount, portfolio.address)

    await setNextBlockTimestamp(startTxTimestamp + timeElapsed)
    const shares = await investment.convertToShares(investmentDepositAmount)
    await portfolio.executeRedeem(investment.address, shares)

    const portfolioTotalAssets = await portfolio.totalAssets()
    const expectedPortfolioTotalAssets = depositAmountsSum.add(investmentDepositAmount)
    expect(portfolioTotalAssets).to.eq(expectedPortfolioTotalAssets)
  })

  it('emits event', async () => {
    const { portfolio, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    const investmentDepositAmount = parseMockToken(INVESTMENT_DEPOSIT_AMOUNT)

    await portfolio.start()

    const investment = await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
    await investment.approveAndDeposit(investmentDepositAmount, portfolio.address)

    const shares = await investment.convertToShares(investmentDepositAmount)
    await expect(portfolio.executeRedeem(investment.address, shares))
      .to.emit(portfolio, 'ExecutedRedeem')
      .withArgs(investment.address, shares, investmentDepositAmount)
  })
})
