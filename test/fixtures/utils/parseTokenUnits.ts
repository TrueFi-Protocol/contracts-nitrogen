import { utils } from 'ethers'

export const parseTokenUnits = (amount: string | number, tokenDecimals: number) => utils.parseUnits(amount.toString(), tokenDecimals)
