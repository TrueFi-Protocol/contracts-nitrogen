import { expect } from 'chai'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.setProtocolAdmin', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.connect(other).setProtocolAdmin(other.address))
      .to.be.revertedWith('IPPC: Only default admin')
  })

  it('only different value', async () => {
    const { protocolConfig, protocolConfigDeployParams: { protocolAdminAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.setProtocolAdmin(protocolAdminAddress)).to.be.revertedWith('IPPC: Admin already set')
  })

  it('sets new value', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await protocolConfig.setProtocolAdmin(other.address)
    expect(await protocolConfig.protocolAdmin()).to.eq(other.address)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.setProtocolAdmin(other.address))
      .to.emit(protocolConfig, 'ProtocolAdminChanged').withArgs(other.address)
  })
})
