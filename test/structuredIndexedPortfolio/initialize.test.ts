import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber } from 'ethers'
import { structuredIndexedPortfolioFixture, StructuredIndexedPortfolioStatus } from 'fixtures/structuredIndexedPortfolioFixture'
import { deployMockToken, deployStructuredIndexedPortfolio, deployTranches } from 'fixtures/tasks'
import { getStructuredIndexedPortfolioDeployParams, getTrancheDeployParams } from 'fixtures/utils'
import { setupFixtureLoader } from 'test/setup'
import { DEFAULT_ADMIN_ROLE, MANAGER_ROLE, MAX_UINT_256, PAUSER_ROLE, getTxTimestamp, objectDeepCopy } from 'utils'

use(solidity)

describe('StructuredIndexedPortfolio.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('sets protocol admin as admin', async () => {
    const { portfolio, protocolConfig } = await loadFixture(structuredIndexedPortfolioFixture)
    const protocolAdminAddress = await protocolConfig.protocolAdmin()
    expect(await portfolio.hasRole(DEFAULT_ADMIN_ROLE, protocolAdminAddress)).to.be.true
  })

  it('sets protocol pauser as pauser', async () => {
    const { portfolio, protocolConfig } = await loadFixture(structuredIndexedPortfolioFixture)
    const pauserAddress = await protocolConfig.pauserAddress()
    expect(await portfolio.hasRole(PAUSER_ROLE, pauserAddress)).to.be.true
  })

  it('sets wallet as manager role', async () => {
    const { portfolio, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.hasRole(MANAGER_ROLE, wallet.address)).to.be.true
  })

  it('sets protocol config', async () => {
    const { portfolio, protocolConfig } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.protocolConfig()).to.eq(protocolConfig.address)
  })

  it('sets vaults registry', async () => {
    const { portfolio, factoryDeployParams: { vaultsRegistryAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.vaultsRegistry()).to.eq(vaultsRegistryAddress)
  })

  it('sets asset', async () => {
    const { portfolio, token } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.asset()).to.eq(token.address)
  })

  it('sets status', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.status()).to.eq(StructuredIndexedPortfolioStatus.CapitalFormation)
  })

  it('sets name', async () => {
    const { portfolio, portfolioParams } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.name()).to.eq(portfolioParams.name)
  })

  it('sets portfolio duration', async () => {
    const { portfolio, portfolioParams } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.portfolioDuration()).to.eq(portfolioParams.duration)
  })

  it('sets start deadline', async () => {
    const { portfolio, portfolioCreationTx, portfolioParams } = await loadFixture(structuredIndexedPortfolioFixture)
    const portfolioDeployedTimestamp = await getTxTimestamp(portfolioCreationTx)
    const startDeadline = BigNumber.from(portfolioDeployedTimestamp).add(portfolioParams.capitalFormationPeriod)
    expect(await portfolio.startDeadline()).to.eq(startDeadline)
  })

  it('sets minimum size', async () => {
    const { portfolio, portfolioParams } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.minimumSize()).to.eq(portfolioParams.minimumSize)
  })

  it('sets expected equity rate', async () => {
    const { portfolio, expectedEquityRate } = await loadFixture(structuredIndexedPortfolioFixture)
    const portfolioExpectedEquityRate = await portfolio.expectedEquityRate()
    expect(portfolioExpectedEquityRate.from).to.eq(expectedEquityRate.from)
    expect(portfolioExpectedEquityRate.to).to.eq(expectedEquityRate.to)
  })

  it('sets tranches', async () => {
    const { portfolio, tranchesCount, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.getTranches()).to.be.of.length(tranchesCount)
    for (let i = 0; i < tranchesCount; i++) {
      expect(await portfolio.tranches(i)).to.eq(tranches[i].address)
    }
  })

  it('reverts when tranche has different token', async () => {
    const { token, wallet, protocolConfig, vaultsRegistry, standaloneControllers } = await loadFixture(structuredIndexedPortfolioFixture)
    const differentDecimalsToken = await deployMockToken(wallet, 1)

    const trancheDeployParams = getTrancheDeployParams(wallet, differentDecimalsToken, protocolConfig, standaloneControllers)
    const trancheRatios = [{ minSubordinateRatio: 0, targetApy: 0 }]
    const differentTokenTranche = await deployTranches(wallet, trancheDeployParams, trancheRatios)
    const deployParams = getStructuredIndexedPortfolioDeployParams(wallet, token, protocolConfig, vaultsRegistry, differentTokenTranche.tranchesInitData)

    await expect(deployStructuredIndexedPortfolio(wallet, deployParams))
      .to.be.revertedWith('SIP: Asset mismatched')
  })

  it('reverts for 0 tranches', async () => {
    const { portfolioFactory, token, portfolioParams, expectedEquityRate } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolioFactory.createPortfolio(token.address, portfolioParams, [], expectedEquityRate))
      .to.be.revertedWith('SIP: Cannot create portfolio without tranches')
  })

  it('reverts when first tranche has non zero apy', async () => {
    const { portfolioFactory, token, tranchesInitData, portfolioParams, expectedEquityRate } = await loadFixture(structuredIndexedPortfolioFixture)
    const newTranchesInitData = objectDeepCopy(tranchesInitData)
    newTranchesInitData[0].targetApy = 2
    await expect(portfolioFactory.createPortfolio(token.address, portfolioParams, newTranchesInitData, expectedEquityRate))
      .to.be.revertedWith('SIP: Target APY in tranche #0 must be 0')
  })

  it('reverts when first tranche has non zero ratio', async () => {
    const { portfolioFactory, token, tranchesInitData, portfolioParams, expectedEquityRate } = await loadFixture(structuredIndexedPortfolioFixture)
    const newTranchesInitData = objectDeepCopy(tranchesInitData)
    newTranchesInitData[0].minSubordinateRatio = 2
    await expect(portfolioFactory.createPortfolio(token.address, portfolioParams, newTranchesInitData, expectedEquityRate))
      .to.be.revertedWith('SIP: Min sub ratio in tranche #0 must be 0')
  })

  it('initializes portfolio in tranche', async () => {
    const { tranches, portfolio, tranchesCount } = await loadFixture(structuredIndexedPortfolioFixture)
    for (let i = 0; i < tranchesCount; i++) {
      expect(await tranches[i].portfolio()).to.eq(portfolio.address)
    }
  })

  it('approves tokens for tranches', async () => {
    const { tranches, portfolio, token, tranchesCount } = await loadFixture(structuredIndexedPortfolioFixture)
    for (let i = 0; i < tranchesCount; i++) {
      expect(await token.allowance(portfolio.address, tranches[i].address)).to.eq(MAX_UINT_256)
    }
  })

  it('correctly initializes tranche data', async () => {
    const { portfolio, tranchesCount, tranchesInitData } = await loadFixture(structuredIndexedPortfolioFixture)
    for (let i = 0; i < tranchesCount; i++) {
      const contractTrancheData = await portfolio.tranchesData(i)
      expect(contractTrancheData.minSubordinateRatio).to.eq(tranchesInitData[i].minSubordinateRatio)
      expect(contractTrancheData.targetApy).to.eq(tranchesInitData[i].targetApy)
      expect(contractTrancheData.distributedAssets).to.eq(0)
      expect(contractTrancheData.maxValueOnClose).to.eq(0)
      expect(contractTrancheData.investmentsDeficitCheckpoint.deficit).to.eq(0)
      expect(contractTrancheData.investmentsDeficitCheckpoint.timestamp).to.eq(0)
    }
  })
})
