import { Zero } from '@ethersproject/constants'
import { TranchesConfig } from 'fixtures/types'
import { parseTokenUnits } from 'fixtures/utils'

export const TOKEN_DECIMALS = 6

export const TRANCHES_CONFIG: TranchesConfig = {
  controllers: {
    depositControllerFeeRate: Zero,
    depositControllersCeilings: [
      parseTokenUnits(5_000_000, TOKEN_DECIMALS),
      parseTokenUnits(5_000_000, TOKEN_DECIMALS),
      parseTokenUnits(10_000_000, TOKEN_DECIMALS),
    ],
    withdrawControllerFeeRate: Zero,
    withdrawControllerFloors: [
      Zero,
      Zero,
      Zero,
    ],
  },
  tranches: {
    names: ['Equity Tranche', 'Junior Tranche', 'Senior Tranche'],
    symbols: ['EQT', 'JNT', 'SNT'],
    targetAPYs: [0, 500, 300],
    minSubordinateRatios: [0, 0, 0],
    managerFeeRates: [0, 0, 0],
  },
}

export const UNITRANCHE_CONFIG: TranchesConfig = {
  controllers: {
    depositControllerFeeRate: Zero,
    depositControllersCeilings: [
      parseTokenUnits(5_000_000, TOKEN_DECIMALS),
    ],
    withdrawControllerFeeRate: Zero,
    withdrawControllerFloors: [
      Zero,
    ],
  },
  tranches: {
    names: ['Uno Tranche'],
    symbols: ['UT'],
    targetAPYs: [0],
    minSubordinateRatios: [0],
    managerFeeRates: [0],
  },
}
