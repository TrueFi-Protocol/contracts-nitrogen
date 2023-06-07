import { expect } from 'chai'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.setProtocolTreasury', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.connect(other).setProtocolTreasury(other.address))
      .to.be.revertedWith('IPPC: Only default admin')
  })

  it('only different value', async () => {
    const { protocolConfig, protocolConfigDeployParams: { protocolTreasuryAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.setProtocolTreasury(protocolTreasuryAddress)).to.be.revertedWith('IPPC: Treasury already set')
  })

  it('sets new value', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await protocolConfig.setProtocolTreasury(other.address)
    expect(await protocolConfig.protocolTreasury()).to.eq(other.address)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.setProtocolTreasury(other.address))
      .to.emit(protocolConfig, 'ProtocolTreasuryChanged').withArgs(other.address)
  })
})
