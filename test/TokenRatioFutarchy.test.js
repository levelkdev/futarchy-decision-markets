import { expect } from 'chai'

const FCRToken = artifacts.require('FCRToken')
const EtherToken = artifacts.require('EtherToken')
const CentralizedOracleFactory = artifacts.require('CentralizedOracleFactory')
const EventFactory = artifacts.require('EventFactory')
const StandardMarketFactory = artifacts.require('StandardMarketFactory')
const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
const CategoricalEvent = artifacts.require('CategoricalEvent')
const Math = artifacts.require('Math')
const TokenRatioFutarchy = artifacts.require('TokenRatioFutarchy')

import lkTestHelpers from 'lk-test-helpers'
import moment from 'moment'
import { web3 } from './helpers/w3'
const { expectThrow, increaseTime, latestTime } = lkTestHelpers(web3)

const { accounts } = web3.eth

const NULL_ADDR = '0x0000000000000000000000000000000000000000'

describe('TokenRatioFutarchy', () => {
  let assetToken, genericToken, oracleFactory, marketMaker,
      eventFactory, marketFactory, ipfsHash, tokenRatioFutarchy

  before(async () => {
    genericToken  = await EtherToken.new()
    assetToken    = await FCRToken.new()
    oracleFactory = await CentralizedOracleFactory.new()
    eventFactory  = await EventFactory.new()
    marketMaker   = await LMSRMarketMaker.new()
    marketFactory = await StandardMarketFactory.new()
    ipfsHash      = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
  })

  describe('when deployed', () => {
    before(async () => {
      const duration = moment.duration({weeks: 2}).asSeconds()
      tokenRatioFutarchy = await TokenRatioFutarchy.new(
        duration,
        assetToken.address,
        genericToken.address,
        oracleFactory.address,
        eventFactory.address,
        marketFactory.address,
        marketMaker.address,
        ipfsHash
      )
    })

    it('sets the correct assetToken', async () => {
      expect(await tokenRatioFutarchy._assetToken()).to.equal(assetToken.address)
    })

    it('sets the correct genericToken', async () => {
      expect(await tokenRatioFutarchy._genericToken()).to.equal(genericToken.address)
    })

    it('sets the centralizedOracle', async () => {
      expect(await tokenRatioFutarchy._centralizedOracle()).to.not.equal(undefined)
    })
  })

  describe('createAssetTokenCollateralEvent()', () => {
    before(async () => {
      tokenRatioFutarchy = await deployTokenRatioFutarchy()
    })

    it('assigns _assetTokenCollateralEvent a categoricalEvent with _assetToken', async () => {
      expect(await tokenRatioFutarchy._assetTokenCollateralEvent()).to.equal(NULL_ADDR)

      const { logs } = await tokenRatioFutarchy.createAssetTokenCollateralEvent()
      const categoricalEvent = logs.find(e => e.event === 'CategoricalEventCreation')['args']['categoricalEvent']

      expect(await tokenRatioFutarchy._assetTokenCollateralEvent()).to.equal(categoricalEvent)
      expect(await CategoricalEvent.at(categoricalEvent).collateralToken()).to.equal(await tokenRatioFutarchy._assetToken())
    })

    it('throws if _assetTokenCollateralEvent has already been assigned')
  })

  describe('createGenericTokenCollateralEvent()', () => {
    before(async () => {
      marketFactory = await StandardMarketFactory.new()
      assetToken    = await FCRToken.new()
      marketMaker   = await LMSRMarketMaker.new()
      tokenRatioFutarchy = await deployTokenRatioFutarchy(
        {marketFactory, assetToken}
      )
    })
    it.only('assigns _genericTokenCollateralEvent a categoricalEvent with _assetToken', async () => {
      await tokenRatioFutarchy.createAssetTokenCollateralEvent()
      let event = await tokenRatioFutarchy._assetTokenCollateralEvent()
      let marketGuy = await marketFactory.createMarket(event, marketMaker.address, 0)
      // await tokenRatioFutarchy.createAssetTokenMarket(0)
      console.log(marketGuy)
    })
    it('throws if _genericTokenCollateralEvent has already been assigned')
  })
})


async function deployTokenRatioFutarchy(customParams = {}) {
  const {
    genericToken  = await EtherToken.new(),
    assetToken    = await FCRToken.new(),
    oracleFactory = await CentralizedOracleFactory.new(),
    eventFactory  = await EventFactory.new(),
    marketFactory = await StandardMarketFactory.new(),
    ipfsHash      = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    duration      = moment.duration({weeks: 2}).asSeconds(),
    marketMaker   = await LMSRMarketMaker.new()
  } = customParams

  const futarchy = await TokenRatioFutarchy.new(
    duration,
    assetToken.address,
    genericToken.address,
    oracleFactory.address,
    eventFactory.address,
    marketFactory.address,
    marketMaker.address,
    ipfsHash
  )

  return futarchy
}
