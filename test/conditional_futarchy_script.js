/* globals contract it artifacts */

// import lkTestHelpers from 'lk-test-helpers'
import moment from 'moment'

const EtherToken = artifacts.require('EtherToken')
const OutcomeToken = artifacts.require('OutcomeToken')
const CentralizedOracleFactory = artifacts.require('CentralizedOracleFactory')
const EventFactory = artifacts.require('EventFactory')
const CategoricalEvent = artifacts.require('CategoricalEvent')
const ScalarEvent = artifacts.require('ScalarEvent')
const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
const StandardMarketWithPriceLogger = artifacts.require('StandardMarketWithPriceLogger')
const StandardMarketWithPriceLoggerFactory = artifacts.require('StandardMarketWithPriceLoggerFactory')
const FutarchyOracle = artifacts.require('FutarchyOracle')
const FutarchyFactory = artifacts.require('FutarchyOracleFactory')

// const { expectThrow, increaseTime, latestTime } = lkTestHelpers(web3)
// const { accounts } = web3.eth

contract('Conditional Futarchy', (accounts) => {
  it.only('create and resolve futarchy oracle', async () => {
    const [creator] = accounts

    const etherToken = await EtherToken.new()
    const oracleFactory = await CentralizedOracleFactory.new()
    const eventFactory = await EventFactory.new()
    const ipfsHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    const lmsrMarketMaker = await LMSRMarketMaker.new()
    const {logs} = await oracleFactory.createCentralizedOracle(ipfsHash)
    const centralizedOracleAddress = logs.find(e => e.event === 'CentralizedOracleCreation').args.centralizedOracle
    const smpLoggerFactory = await StandardMarketWithPriceLoggerFactory.new()
    const futarchyFactory = await FutarchyFactory.new(eventFactory.address, smpLoggerFactory.address)

    const outcomeCount = 2
    const lowerBound = -100
    const upperBound = 100
    const fee = 5
    const tradingPeriod = moment.duration({days: 1}).asSeconds()
    const startDate = moment().unix() + moment.duration({seconds: 1}).asSeconds()

    const funding = 10 ** 18

    console.log('  *** create futarchy oracle')
    console.log('')

    const { logs: createFutarchyOracleLogs } = await futarchyFactory.createFutarchyOracle(
      etherToken.address,
      centralizedOracleAddress,
      outcomeCount,
      lowerBound,
      upperBound,
      lmsrMarketMaker.address,
      fee,
      tradingPeriod,
      startDate
    )
    const { futarchyOracle: futarchyOracleAddress } = createFutarchyOracleLogs.find(
      e => e.event === 'FutarchyOracleCreation'
    ).args

    const futarchyOracle = FutarchyOracle.at(futarchyOracleAddress)
    const marketForAccepted = StandardMarketWithPriceLogger.at(await futarchyOracle.markets(0))
    const marketForDenied = StandardMarketWithPriceLogger.at(await futarchyOracle.markets(1))
    const acceptedDeniedEvent = CategoricalEvent.at(await futarchyOracle.categoricalEvent())
    const acceptedLongShortEvent = ScalarEvent.at(await marketForAccepted.eventContract())
    const deniedLongShortEvent = ScalarEvent.at(await marketForDenied.eventContract())

    const acceptedDeniedTokenAddresses = await acceptedDeniedEvent.getOutcomeTokens()
    const acceptedToken = OutcomeToken.at(acceptedDeniedTokenAddresses[0])
    const deniedToken = OutcomeToken.at(acceptedDeniedTokenAddresses[1])

    const acceptedLongShortTokenAddresses = await acceptedLongShortEvent.getOutcomeTokens()
    const acceptedLongToken = OutcomeToken.at(acceptedLongShortTokenAddresses[0])
    const acceptedShortToken = OutcomeToken.at(acceptedLongShortTokenAddresses[1])

    const deniedLongShortTokenAddresses = await deniedLongShortEvent.getOutcomeTokens()
    const deniedLongToken = OutcomeToken.at(deniedLongShortTokenAddresses[0])
    const deniedShortToken = OutcomeToken.at(deniedLongShortTokenAddresses[1])

    console.log('  *** fund the futarchy oracle')
    console.log('')

    await etherToken.deposit({ value: funding, from: creator })
    await etherToken.approve(futarchyOracle.address, funding, { from: creator })
    await futarchyOracle.fund(funding, { from: creator })

    await logBalances()
    await logOutcomeTokenCosts()

    async function logBalances () {
      console.log('  BALANCES')
      console.log('  --------')
      console.log('  | MARKET CREATOR')
      console.log('  | --------------')
      await logTokenBalances(creator)
      console.log('  |')

      console.log('  | ACCEPTED/DENIED EVENT CONTRACT')
      console.log('  | ------------------------------')
      await logTokenBalances(acceptedDeniedEvent.address)
      console.log('  |')

      console.log('  | ACCEPTED SCALAR MARKET')
      console.log('  | ----------------------')
      await logTokenBalances(marketForAccepted.address)
      console.log('  |')

      console.log('  | DENIED SCALAR MARKET')
      console.log('  | ----------------------')
      await logTokenBalances(marketForDenied.address)
      console.log('  |')

      console.log('  | ACCEPTED LONG/SHORT EVENT')
      console.log('  | ----------------------')
      await logTokenBalances(acceptedLongShortEvent.address)
      console.log('  |')

      console.log('  | DENIED LONG/SHORT EVENT')
      console.log('  | ----------------------')
      await logTokenBalances(deniedLongShortEvent.address)
      console.log('')
    }

    async function logTokenBalances (account) {
      await logTokenBalance('EtherToken', etherToken, account)
      await logTokenBalance('AcceptedToken', acceptedToken, account)
      await logTokenBalance('DeniedToken', deniedToken, account)
      await logTokenBalance('AcceptedLongToken', acceptedLongToken, account)
      await logTokenBalance('AcceptedShortToken', acceptedShortToken, account)
      await logTokenBalance('DeniedLongToken', deniedLongToken, account)
      await logTokenBalance('DeniedShortToken', deniedShortToken, account)
    }

    async function logTokenBalance (tokenName, token, account) {
      const bal = (await token.balanceOf(account)).toNumber()
      if (bal > 0) {
        console.log(`  | ${tokenName}: ${bal / 10 ** 18}`)
      }
    }

    async function logOutcomeTokenCosts () {
      const longAcceptedCost = await lmsrMarketMaker.calcCost.call(marketForAccepted.address, 0, 1e15)
      const shortAcceptedCost = await lmsrMarketMaker.calcCost.call(marketForAccepted.address, 1, 1e15)
      const longDeniedCost = await lmsrMarketMaker.calcCost.call(marketForDenied.address, 0, 1e15)
      const shortDeniedCost = await lmsrMarketMaker.calcCost.call(marketForDenied.address, 1, 1e15)
      console.log('  TOKEN PRICES')
      console.log('  ------------')
      console.log('  LONG_ACCEPTED: ', longAcceptedCost.toNumber() / 10 ** 18)
      console.log('  SHORT_ACCEPTED: ', shortAcceptedCost.toNumber() / 10 ** 18)
      console.log('  LONG_DENIED: ', longDeniedCost.toNumber() / 10 ** 18)
      console.log('  SHORT_DENIED: ', shortDeniedCost.toNumber() / 10 ** 18)
      console.log('')
    }
  })
})
