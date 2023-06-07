import { StructuredIndexedPortfolio } from 'build/types'

export function getPortfolioDuration(portfolio: StructuredIndexedPortfolio) {
  return getPortfolioDurationFraction(portfolio, 1)
}

export function getHalfPortfolioDuration(portfolio: StructuredIndexedPortfolio) {
  return getPortfolioDurationFraction(portfolio, 2)
}

export function getQuarterPortfolioDuration(portfolio: StructuredIndexedPortfolio) {
  return getPortfolioDurationFraction(portfolio, 4)
}

export async function getPortfolioDurationFraction(portfolio: StructuredIndexedPortfolio, divider: number) {
  const portfolioDuration = await portfolio.portfolioDuration()
  return portfolioDuration.div(divider).toNumber()
}
