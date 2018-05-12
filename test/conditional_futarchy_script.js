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
    const [creator, longAcceptedBuyer] = accounts

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
    const fee = 0
    const tradingPeriod = moment.duration({days: 1}).asSeconds()
    const startDate = moment().unix() + moment.duration({seconds: 1}).asSeconds()

    const funding = 10 * 10 ** 18

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
    const categoricalEvent = CategoricalEvent.at(await futarchyOracle.categoricalEvent())
    const acceptedLongShortEvent = ScalarEvent.at(await marketForAccepted.eventContract())
    const deniedLongShortEvent = ScalarEvent.at(await marketForDenied.eventContract())

    const acceptedDeniedTokenAddresses = await categoricalEvent.getOutcomeTokens()
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

    console.log('  *** buy LONG_ACCEPTED')
    console.log('')

    const buyAmt = 4 * 10 ** 18
    await etherToken.deposit({ value: buyAmt, from: longAcceptedBuyer })
    await etherToken.approve(categoricalEvent.address, buyAmt, { from: longAcceptedBuyer })
    await categoricalEvent.buyAllOutcomes(buyAmt, { from: longAcceptedBuyer })

    const longAcceptedCost = await getLongAcceptedCost(buyAmt)
    const longAcceptedFee = await getLongAcceptedFee(longAcceptedCost)
    const maxCost = longAcceptedCost + longAcceptedFee + 1000

    await acceptedToken.approve(marketForAccepted.address, maxCost, { from: longAcceptedBuyer })
    await marketForAccepted.buy(0, buyAmt, maxCost, { from: longAcceptedBuyer })

    await logBalances()
    await logOutcomeTokenCosts()

    async function logBalances () {
      console.log('  Token Holders')
      console.log('  -------------')
      console.log('    Market Creator')
      console.log('    --------------')
      await logTokenBalances(creator)
      console.log('   ')

      console.log('    Buyer: LONG_ACCEPTED')
      console.log('    --------------------')
      await logTokenBalances(longAcceptedBuyer)
      console.log('   ')

      console.log('  Event Contracts')
      console.log('  ---------------')

      console.log('    ACCEPTED/DENIED : ETH')
      console.log('    ---------------------')
      await logTokenBalances(categoricalEvent.address)
      console.log('   ')

      console.log('    LONG/SHORT : ACCEPTED')
      console.log('    ---------------------')
      await logTokenBalances(acceptedLongShortEvent.address)
      console.log('   ')

      console.log('    LONG/SHORT : DENIED')
      console.log('    -------------------')
      await logTokenBalances(deniedLongShortEvent.address)
      console.log('')

      console.log('  Market Contracts')
      console.log('  ----------------')

      console.log('    LONG_ACCEPTED | SHORT_ACCEPTED')
      console.log('    ------------------------------')
      await logTokenBalances(marketForAccepted.address)
      console.log('   ')

      console.log('    LONG_DENIED | SHORT_DENIED')
      console.log('    --------------------------')
      await logTokenBalances(marketForDenied.address)
      console.log('   ')
    }

    async function logTokenBalances (account) {
      await logTokenBalance('EtherToken', etherToken, account)
      await logTokenBalance('Accepted', acceptedToken, account)
      await logTokenBalance('Denied', deniedToken, account)
      await logTokenBalance('LongAccepted', acceptedLongToken, account)
      await logTokenBalance('ShortAccepted', acceptedShortToken, account)
      await logTokenBalance('LongDenied', deniedLongToken, account)
      await logTokenBalance('ShortDenied', deniedShortToken, account)
    }

    async function logTokenBalance (tokenName, token, account) {
      const bal = (await token.balanceOf(account)).toNumber()
      if (bal > 0) {
        console.log(`    ${tokenName}: ${bal / 10 ** 18}`)
      }
    }

    async function logOutcomeTokenCosts () {
      const longAcceptedCost = await getLongAcceptedCost(1e15)
      const shortAcceptedCost = await getShortAcceptedCost(1e15)
      const longDeniedCost = await getLongDeniedCost(1e15)
      const shortDeniedCost = await getShortDeniedCost(1e15)
      console.log('  TOKEN PRICES')
      console.log('  ------------')
      console.log('  LONG_ACCEPTED: ', longAcceptedCost / 10 ** 15)
      console.log('  SHORT_ACCEPTED: ', shortAcceptedCost / 10 ** 15)
      console.log('  LONG_DENIED: ', longDeniedCost / 10 ** 15)
      console.log('  SHORT_DENIED: ', shortDeniedCost / 10 ** 15)
      console.log('')
    }

    async function getLongAcceptedCost (tokenAmount) {
      const cost = await getOutcomeTokenCost(marketForAccepted.address, 0, tokenAmount)
      return cost
    }

    async function getLongAcceptedFee (tokenCost) {
      const fee = await getMarketFee(marketForAccepted, tokenCost)
      return fee
    }

    async function getShortAcceptedCost (tokenAmount) {
      const cost = await getOutcomeTokenCost(marketForAccepted.address, 1, tokenAmount)
      return cost
    }

    async function getLongDeniedCost (tokenAmount) {
      const cost = await getOutcomeTokenCost(marketForDenied.address, 0, tokenAmount)
      return cost
    }

    async function getShortDeniedCost (tokenAmount) {
      const cost = await getOutcomeTokenCost(marketForDenied.address, 1, tokenAmount)
      return cost
    }

    async function getOutcomeTokenCost (marketAddress, outcomeTokenIndex, tokenAmount) {
      const cost = await lmsrMarketMaker.calcCost.call(marketAddress, outcomeTokenIndex, tokenAmount)
      return cost.toNumber()
    }

    async function getMarketFee (market, tokenCost) {
      const fee = await market.calcMarketFee.call(tokenCost)
      return fee.toNumber()
    }
  })
})
