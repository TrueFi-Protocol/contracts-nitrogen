import { expect } from 'chai'
import { StructuredIndexedPortfolioStatus, structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { getTxTimestamp, ONE_HUNDRED_PERCENT_IN_BIPS, calculateSuperiorTranchesMaxValues } from 'utils'

describe('StructuredIndexedPortfolio.start', () => {
  const loadFixture = setupFixtureLoader()

  const juniorMinSubordinateRatio = 2 * ONE_HUNDRED_PERCENT_IN_BIPS
  const seniorMinSubordinateRatio = 5 * ONE_HUNDRED_PERCENT_IN_BIPS
  const customMinSubordinateRatios = [0, juniorMinSubordinateRatio, seniorMinSubordinateRatio]

  it('only manager', async () => {
    const { portfolio, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolio.connect(other).start())
      .to.be.revertedWith('SIP: Only manager')
  })

  it('changes status', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.start()
    expect(await portfolio.status()).to.eq(StructuredIndexedPortfolioStatus.Live)
  })

  it('only in capital formation', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.start()
    await expect(portfolio.start()).to.be.revertedWith('SIP: Portfolio is not in capital formation')
  })

  it('reverts when portfolio is paused', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.pause()
    await expect(portfolio.start()).to.be.revertedWith('Pausable: paused')
  })

  it('junior min ratio not met', async () => {
    const { portfolio, tranches, approveAndDepositToTranche, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.setMinSubordinateRatios(customMinSubordinateRatios)

    const equityAssets = parseMockToken(1_000_000)
    const [juniorAssets, seniorAssets] = calculateSuperiorTranchesMaxValues(equityAssets, customMinSubordinateRatios)
    const juniorAssetsOverflow = 1

    await approveAndDepositToTranche(tranches[0], equityAssets, wallet)
    await approveAndDepositToTranche(tranches[1], juniorAssets.add(juniorAssetsOverflow), wallet)
    await approveAndDepositToTranche(tranches[2], seniorAssets, wallet)

    await expect(portfolio.start()).to.be.revertedWith('SIP: Tranche min ratio not met')
  })

  it('senior min ratio not met', async () => {
    const { portfolio, tranches, approveAndDepositToTranche, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.setMinSubordinateRatios(customMinSubordinateRatios)

    const equityAssets = parseMockToken(1_000_000)
    const [juniorAssets, seniorAssets] = calculateSuperiorTranchesMaxValues(equityAssets, customMinSubordinateRatios)
    const seniorAssetsOverflow = 1

    await approveAndDepositToTranche(tranches[0], equityAssets, wallet)
    await approveAndDepositToTranche(tranches[1], juniorAssets, wallet)
    await approveAndDepositToTranche(tranches[2], seniorAssets.add(seniorAssetsOverflow), wallet)

    await expect(portfolio.start()).to.be.revertedWith('SIP: Tranche min ratio not met')
  })

  it('under minimumSize', async () => {
    const { portfolio, tranches, wallet, parseMockToken, approveAndDepositToTranche } = await loadFixture(structuredIndexedPortfolioFixture)

    const equityAssets = parseMockToken(1_000_000)
    const juniorAssets = parseMockToken(100_000)
    const seniorAssets = parseMockToken(10_000)
    const totalAssets = equityAssets.add(juniorAssets).add(seniorAssets)
    const totalAssetsUnderflow = 1

    await portfolio.setMinimumSize(totalAssets.add(totalAssetsUnderflow))

    await approveAndDepositToTranche(tranches[0], equityAssets, wallet)
    await approveAndDepositToTranche(tranches[1], juniorAssets, wallet)
    await approveAndDepositToTranche(tranches[2], seniorAssets, wallet)

    await expect(portfolio.start()).to.be.revertedWith('SIP: Portfolio minimum size not reached')
  })

  it('pulls funds from vaults to portfolio', async () => {
    const { portfolio, tranches, token, approveAndDepositToTranche, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.setMinSubordinateRatios(customMinSubordinateRatios)

    const equityAssets = parseMockToken(1_000_000)
    const [juniorAssets, seniorAssets] = calculateSuperiorTranchesMaxValues(equityAssets, customMinSubordinateRatios)
    const depositAssetsSum = equityAssets.add(juniorAssets).add(seniorAssets)

    await portfolio.setMinimumSize(depositAssetsSum)

    await approveAndDepositToTranche(tranches[0], equityAssets, wallet)
    await approveAndDepositToTranche(tranches[1], juniorAssets, wallet)
    await approveAndDepositToTranche(tranches[2], seniorAssets, wallet)
    await portfolio.start()

    for (const tranche of tranches) {
      expect(await token.balanceOf(tranche.address)).to.eq(0)
    }
    expect(await token.balanceOf(portfolio.address)).to.eq(depositAssetsSum)
    expect(await portfolio.virtualTokenBalance()).to.eq(depositAssetsSum)
  })

  it('calls onPortfolioStarts on tranches', async () => {
    const { portfolio, tranches } = await loadFixture(structuredIndexedPortfolioFixture)

    await portfolio.start()

    for (const tranche of tranches) {
      expect('onPortfolioStart').to.be.calledOnContract(tranche)
    }
  })

  it('sets portfolio start date', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    const tx = await portfolio.start()
    const txTimestamp = await getTxTimestamp(tx)
    expect(await portfolio.startDate()).to.eq(txTimestamp)
  })

  it('sets portfolio end date', async () => {
    const { portfolio, portfolioParams } = await loadFixture(structuredIndexedPortfolioFixture)
    const tx = await portfolio.start()
    const txTimestamp = await getTxTimestamp(tx)
    expect(await portfolio.endDate()).to.eq(txTimestamp + portfolioParams.duration)
  })

  it('emits event', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolio.start()).to.emit(portfolio, 'PortfolioStatusChanged').withArgs(StructuredIndexedPortfolioStatus.Live)
  })
})
