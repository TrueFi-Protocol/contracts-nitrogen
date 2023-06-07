import { BigNumber } from 'ethers'

export function subtractArrays(arrayA: BigNumber[], arrayB: BigNumber[]) {
  return arrayA.map((a, i) => a.sub(arrayB[i]))
}
