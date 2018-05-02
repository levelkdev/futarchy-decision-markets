import { expect } from 'chai'

const FCRToken = artifacts.require('FCRToken')
const EtherToken = artifacts.require('EtherToken')
const CentralizedOracleFactory = artifacts.require('CentralizedOracleFactory')
const EventFactory = artifacts.require('EventFactory')
const CategoricalEvent = artifacts.require('CategoricalEvent')
const Math = artifacts.require('Math')
const TokenRatioFutarchy = artifacts.require('TokenRatioFutarchy')
const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
const StandardMarket = artifacts.require('StandardMarket')
const StandardMarketFactory = artifacts.require('StandardMarketFactory')

import lkTestHelpers from 'lk-test-helpers'
import moment from 'moment'
import { web3 } from './helpers/w3'
const { expectThrow, increaseTime, latestTime } = lkTestHelpers(web3)

const { accounts } = web3.eth

const BIG_NUM = 10000000

describe('TokenRatioFutarchy', () => {
  it('spins up the Futarchy correctly', async () => {
    const genericToken  = await EtherToken.new()
    const assetToken    = await FCRToken.new()
    const oracleFactory = await CentralizedOracleFactory.new()
    const eventFactory  = await EventFactory.new()
    const ipfsHash      = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    const duration      = moment.duration({weeks: 2}).asSeconds()
    const marketMaker   = await LMSRMarketMaker.new()
    const marketFactory = await StandardMarketFactory.new()

    const tokenRatioFutarchy = await TokenRatioFutarchy.new(
      duration,
      assetToken.address,
      genericToken.address,
      oracleFactory.address,
      eventFactory.address,
      marketFactory.address,
      marketMaker.address,
      ipfsHash
    )

    const creator = accounts[0]
    const buyer   = accounts[1]

    await tokenRatioFutarchy.createAssetTokenCollateralEvent();
    await tokenRatioFutarchy.createGenericTokenCollateralEvent();

    const assetTokenCollateralEvent = await tokenRatioFutarchy._assetTokenCollateralEvent()
    const genericTokenCollateralEvent = await tokenRatioFutarchy._genericTokenCollateralEvent()


    let { logs } = await marketFactory.createMarket(
      assetTokenCollateralEvent,
      marketMaker.address,
      0
    )
    let marketAddr = logs.find(e => e.event === 'StandardMarketCreation')['args']['market']
    const assetTokenMarket = await StandardMarket.at(marketAddr)
    console.log(`created StandardMarket at ${marketAddr} for assetToken`)

    logs =  (await marketFactory.createMarket(
      genericTokenCollateralEvent,
      marketMaker.address,
      0
    )).logs
    marketAddr = logs.find(e => e.event === 'StandardMarketCreation')['args']['market']
    const genericTokenMarket = await StandardMarket.at(marketAddr)
    console.log(`created StandardMarket at ${marketAddr} for genericToken`)

    console.log(`AssetMarket Stage: ${await assetTokenMarket.stage()}`)
    await assetToken.mint(creator, 10 * BIG_NUM)
    await assetToken.mint(buyer, 10 * BIG_NUM)
    await assetToken.approve(assetTokenMarket.address, 10 * BIG_NUM)
    await assetToken.approve(assetTokenMarket.address, 10 * BIG_NUM, {from: buyer})
    console.log('Funding AssetTokenMarket')
    await assetTokenMarket.fund(10 * BIG_NUM)
    console.log(`AssetMarket Stage: ${await assetTokenMarket.stage()}`)

    console.log('Y-Token Cost: ', (await marketMaker.calcCost(assetTokenMarket.address, 0, 1 * BIG_NUM)).toNumber())
    console.log('buying 2 Y-Tokens')
    await assetTokenMarket.buy(0, 5 * BIG_NUM, 10 * BIG_NUM, {from: buyer})
    console.log(await assetToken.balanceOf(buyer))
    console.log('Y-Token Cost: ', (await marketMaker.calcCost(assetTokenMarket.address, 0, 1 * BIG_NUM)).toNumber())
  })
})
