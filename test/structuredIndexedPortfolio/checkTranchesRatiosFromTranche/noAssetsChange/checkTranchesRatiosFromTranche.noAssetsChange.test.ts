import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_HUNDRED_PERCENT_IN_BIPS } from 'utils/constants'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 1_000_000
const JUNIOR_DEPOSIT_ASSETS = 500_000
const SENIOR_DEPOSIT_ASSETS = 300_000
const JUNIOR_MIN_SUBORDINATE_RATIO = 2 * ONE_HUNDRED_PERCENT_IN_BIPS
const SENIOR_MIN_SUBORDINATE_RATIO = 5 * ONE_HUNDRED_PERCENT_IN_BIPS
const MIN_SUBORDINATE_RATIOS = [0, JUNIOR_MIN_SUBORDINATE_RATIO, SENIOR_MIN_SUBORDINATE_RATIO]

describe('StructuredIndexedPortfolio.checkTranchesRatiosFromTranche.noAssetsChange', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('unitranche', async () => {
      const { unitranchePortfolio: portfolio, unitranche: tranche, provider } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityAdditionalDepositAssets = 0

      await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(equityAdditionalDepositAssets, { from: tranche.address })).not.to.be.reverted
    })

    describe('multitranche', () => {
      it('equity calls, ratios met', async () => {
        const { portfolio, tranches, provider } = await loadFixture(structuredIndexedPortfolioFixture)
        await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
        const additionalDepositAssets = 0

        await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(additionalDepositAssets, { from: tranches[0].address })).not.to.be.reverted
      })

      it('junior calls, ratios met', async () => {
        const { portfolio, tranches, provider } = await loadFixture(structuredIndexedPortfolioFixture)
        await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
        const additionalDepositAssets = 0

        await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(additionalDepositAssets, { from: tranches[1].address })).not.to.be.reverted
      })

      it('senior calls, ratios met', async () => {
        const { portfolio, tranches, provider } = await loadFixture(structuredIndexedPortfolioFixture)
        await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
        const additionalDepositAssets = 0

        await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(additionalDepositAssets, { from: tranches[2].address })).not.to.be.reverted
      })
    })
  })

  describe('with assets deposited', () => {
    it('unitranche', async () => {
      const { unitranchePortfolio: portfolio, unitranche: tranche, approveAndDepositToTranche, parseMockToken, wallet, provider } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)

      await approveAndDepositToTranche(tranche, equityDepositAssets, wallet)
      await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(equityDepositAssets, { from: tranche.address })).not.to.be.reverted
    })

    describe('multitranche', () => {
      it('equity calls, ratios met', async () => {
        const { portfolio, tranches, parseMockToken, provider, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
        await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
        const depositAmounts = [parseMockToken(EQUITY_DEPOSIT_ASSETS), parseMockToken(JUNIOR_DEPOSIT_ASSETS), parseMockToken(SENIOR_DEPOSIT_ASSETS)]

        await depositToTranches(portfolio, depositAmounts, wallet)

        await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(depositAmounts[0], { from: tranches[0].address })).not.to.be.reverted
      })

      it('junior calls, ratios met', async () => {
        const { portfolio, tranches, parseMockToken, provider, approveAndDepositToTranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
        await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
        const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
        const juniorDepositAssets = parseMockToken(JUNIOR_DEPOSIT_ASSETS)

        await approveAndDepositToTranche(tranches[0], equityDepositAssets, wallet)
        await approveAndDepositToTranche(tranches[1], juniorDepositAssets, wallet)

        await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(juniorDepositAssets, { from: tranches[1].address })).not.to.be.reverted
      })

      it('junior calls, ratios not met', async () => {
        const { portfolio, tranches, parseMockToken, provider, approveAndDepositToTranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
        await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
        const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
        const juniorDepositAssetsOverflow = 1
        const juniorDepositAssets = parseMockToken(JUNIOR_DEPOSIT_ASSETS).add(juniorDepositAssetsOverflow)

        await approveAndDepositToTranche(tranches[0], equityDepositAssets, wallet)
        await approveAndDepositToTranche(tranches[1], equityDepositAssets, wallet)

        await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(juniorDepositAssets, { from: tranches[1].address })).to.be.revertedWith('SIP: Tranche min ratio not met')
      })

      it('senior calls, ratios met', async () => {
        const { portfolio, tranches, parseMockToken, provider, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
        await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
        const depositAmounts = [parseMockToken(EQUITY_DEPOSIT_ASSETS), parseMockToken(JUNIOR_DEPOSIT_ASSETS), parseMockToken(SENIOR_DEPOSIT_ASSETS)]
        const seniorDepositAssets = depositAmounts[2]

        await depositToTranches(portfolio, depositAmounts, wallet)

        await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(seniorDepositAssets, { from: tranches[2].address })).not.to.be.reverted
      })

      it('senior calls, ratios not met', async () => {
        const { portfolio, tranches, parseMockToken, provider, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
        await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
        const seniorDepositAssetsOverflow = 1
        const depositAmounts = [parseMockToken(EQUITY_DEPOSIT_ASSETS), parseMockToken(JUNIOR_DEPOSIT_ASSETS), parseMockToken(SENIOR_DEPOSIT_ASSETS).add(seniorDepositAssetsOverflow)]
        const seniorDepositAssets = depositAmounts[2]

        await depositToTranches(portfolio, depositAmounts, wallet)

        await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(seniorDepositAssets, { from: tranches[2].address })).to.be.revertedWith('SIP: Tranche min ratio not met')
      })
    })
  })
})
