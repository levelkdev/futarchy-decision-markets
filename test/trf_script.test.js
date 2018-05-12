import { expect } from 'chai'

const FCRToken = artifacts.require('FCRToken')
const EtherToken = artifacts.require('EtherToken')
const CentralizedOracleFactory = artifacts.require('CentralizedOracleFactory')
const CentralizedOracle = artifacts.require('CentralizedOracle')
const EventFactory = artifacts.require('EventFactory')
const CategoricalEvent = artifacts.require('CategoricalEvent')
const Math = artifacts.require('Math')
const TokenRatioFutarchy = artifacts.require('TokenRatioFutarchy')
const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
const StandardMarket = artifacts.require('StandardMarket')
const StandardMarketFactory = artifacts.require('StandardMarketFactory')
const StandardMarketWithPriceLoggerFactory = artifacts.require('StandardMarketWithPriceLoggerFactory')
const FutarchyOracle = artifacts.require('FutarchyOracle')
const FutarchyFactory = artifacts.require('FutarchyOracleFactory')

import lkTestHelpers from 'lk-test-helpers'
import moment from 'moment'
import { web3 } from './helpers/w3'
const { expectThrow, increaseTime, latestTime } = lkTestHelpers(web3)

const { accounts } = web3.eth

const BIG_NUM = 10000000

describe('TokenRatioFutarchy', () => {
  it('spin up Futarchy Oracle', async () => {
    const genericToken  = await EtherToken.new()
    const assetToken    = await FCRToken.new()
    const oracleFactory = await CentralizedOracleFactory.new()
    const eventFactory  = await EventFactory.new()
    const ipfsHash      = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    const duration      = moment.duration({weeks: 2}).asSeconds()
    const marketMaker   = await LMSRMarketMaker.new()
    const marketFactory = await StandardMarketFactory.new()
    const {logs} = await oracleFactory.createCentralizedOracle(ipfsHash)
    const orc = logs.find(e => e.event === 'CentralizedOracleCreation')['args']['centralizedOracle']
    const markFact = await StandardMarketWithPriceLoggerFactory.new()
    const factory = await FutarchyFactory.new(eventFactory.address, markFact.address)
    const date = moment().unix() + moment.duration({days: 1}).asSeconds()

    await factory.createFutarchyOracle(
      assetToken.address,
      orc,
      2,
      -100,
      100,
      marketMaker.address,
      500,
      1000,
      date
    )

  })


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


    await tokenRatioFutarchy.createAssetTokenMarket(0);
    await tokenRatioFutarchy.createGenericTokenMarket(0);

    const assetTokenCollateralEvent = await tokenRatioFutarchy._assetTokenCollateralEvent()
    const genericTokenCollateralEvent = await tokenRatioFutarchy._genericTokenCollateralEvent()


    let funding = 10000
    await assetToken.mint(creator, funding)
    await genericToken.deposit({value: funding})
    assetToken.approve(tokenRatioFutarchy.address, funding)
    genericToken.approve(tokenRatioFutarchy.address, funding)

    await tokenRatioFutarchy.fund(10000)
  })
})
