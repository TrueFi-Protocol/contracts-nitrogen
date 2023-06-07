import { expect } from 'chai'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('sets protocol fee rate', async () => {
    const { protocolConfig, protocolConfigDeployParams: { defaultProtocolFeeRate } } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await protocolConfig.defaultProtocolFeeRate()).to.eq(defaultProtocolFeeRate)
  })

  it('sets protocol admin', async () => {
    const { protocolConfig, protocolConfigDeployParams: { protocolAdminAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await protocolConfig.protocolAdmin()).to.eq(protocolAdminAddress)
  })

  it('sets protocol treasury', async () => {
    const { protocolConfig, protocolConfigDeployParams: { protocolTreasuryAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await protocolConfig.protocolTreasury()).to.eq(protocolTreasuryAddress)
  })

  it('sets pauser address', async () => {
    const { protocolConfig, protocolConfigDeployParams: { pauserAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await protocolConfig.pauserAddress()).to.eq(pauserAddress)
  })
})
