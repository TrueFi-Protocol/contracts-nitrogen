import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { calculateTrancheMaxValue, ONE_HUNDRED_PERCENT_IN_BIPS } from 'utils'

use(solidity)

describe('StructuredIndexedPortfolio.checkTranchesRatios', () => {
  const loadFixture = setupFixtureLoader()
  const juniorMinSubordinateRatio = 2 * ONE_HUNDRED_PERCENT_IN_BIPS
  const seniorMinSubordinateRatio = 5 * ONE_HUNDRED_PERCENT_IN_BIPS
  const minSubordinateRatios = [0, juniorMinSubordinateRatio, seniorMinSubordinateRatio]

  describe('no assets deposited', () => {
    it('passes for unitranche portfolio', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await expect(unitranchePortfolio.checkTranchesRatios())
        .not.to.be.reverted
    })

    it('passes for multitranche portfolio and no min subordinate ratios', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await expect(portfolio.checkTranchesRatios())
        .not.to.be.reverted
    })

    it('passes for multitranche portfolio', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.setMinSubordinateRatios(minSubordinateRatios)
      await expect(portfolio.checkTranchesRatios())
        .not.to.be.reverted
    })
  })

  describe('with assets deposited', () => {
    it('passes for unitranche portfolio', async () => {
      const { unitranchePortfolio, approveAndDepositToTranche, parseMockToken, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAssets = parseMockToken(1_000_000)

      await approveAndDepositToTranche(unitranche, depositAssets, wallet)

      await expect(unitranchePortfolio.checkTranchesRatios())
        .not.to.be.reverted
    })

    it('passes for multitranche portfolio and no min subordinate ratios', async () => {
      const { approveAndDepositToTranche, parseMockToken, wallet, portfolio, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAssets = parseMockToken(1_000_000)

      await approveAndDepositToTranche(tranches[0], depositAssets, wallet)
      await approveAndDepositToTranche(tranches[1], depositAssets, wallet)
      await approveAndDepositToTranche(tranches[2], depositAssets, wallet)

      await expect(portfolio.checkTranchesRatios())
        .not.to.be.reverted
    })

    it('reverts for middle tranche ratio', async () => {
      const { portfolio, tranches, approveAndDepositToTranche, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.setMinSubordinateRatios(minSubordinateRatios)

      const juniorTrancheDepositOverflow = 1
      const equityTrancheDepositAssets = parseMockToken(1_000_000)
      const juniorTrancheDepositAssets = calculateTrancheMaxValue(equityTrancheDepositAssets, juniorMinSubordinateRatio).add(juniorTrancheDepositOverflow)
      const equityAndJuniorAssets = equityTrancheDepositAssets.add(juniorTrancheDepositAssets)
      const seniorTrancheDepositAssets = calculateTrancheMaxValue(equityAndJuniorAssets, seniorMinSubordinateRatio)

      await approveAndDepositToTranche(tranches[0], equityTrancheDepositAssets, wallet)
      await approveAndDepositToTranche(tranches[1], juniorTrancheDepositAssets, wallet)
      await approveAndDepositToTranche(tranches[2], seniorTrancheDepositAssets, wallet)

      await expect(portfolio.checkTranchesRatios())
        .to.be.revertedWith('SIP: Tranche min ratio not met')
    })

    it('reverts for senior tranche ratio', async () => {
      const { portfolio, tranches, approveAndDepositToTranche, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.setMinSubordinateRatios(minSubordinateRatios)

      const seniorTrancheDepositOverflow = 1
      const equityTrancheDepositAssets = parseMockToken(1_000_000)
      const juniorTrancheDepositAssets = calculateTrancheMaxValue(equityTrancheDepositAssets, juniorMinSubordinateRatio)
      const equityAndJuniorAssets = equityTrancheDepositAssets.add(juniorTrancheDepositAssets)
      const seniorTrancheDepositAssets = calculateTrancheMaxValue(equityAndJuniorAssets, seniorMinSubordinateRatio).add(seniorTrancheDepositOverflow)

      await approveAndDepositToTranche(tranches[0], equityTrancheDepositAssets, wallet)
      await approveAndDepositToTranche(tranches[1], juniorTrancheDepositAssets, wallet)
      await approveAndDepositToTranche(tranches[2], seniorTrancheDepositAssets, wallet)

      await expect(portfolio.checkTranchesRatios())
        .to.be.revertedWith('SIP: Tranche min ratio not met')
    })

    it('passes for all ratios satisfied', async () => {
      const { portfolio, tranches, approveAndDepositToTranche, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.setMinSubordinateRatios(minSubordinateRatios)

      const equityTrancheDepositAssets = parseMockToken(1_000_000)
      const juniorTrancheDepositAssets = calculateTrancheMaxValue(equityTrancheDepositAssets, juniorMinSubordinateRatio)
      const equityAndJuniorAssets = equityTrancheDepositAssets.add(juniorTrancheDepositAssets)
      const seniorTrancheDepositAssets = calculateTrancheMaxValue(equityAndJuniorAssets, seniorMinSubordinateRatio)

      await approveAndDepositToTranche(tranches[0], equityTrancheDepositAssets, wallet)
      await approveAndDepositToTranche(tranches[1], juniorTrancheDepositAssets, wallet)
      await approveAndDepositToTranche(tranches[2], seniorTrancheDepositAssets, wallet)

      await expect(portfolio.checkTranchesRatios())
        .not.to.be.reverted
    })
  })
})
