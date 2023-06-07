import { deploy } from 'ethereum-mars'
import { deployNitrogen } from './deployNitrogen'

deploy({ verify: true }, deployNitrogen)
