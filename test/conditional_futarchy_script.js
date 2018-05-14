/* globals contract it artifacts */

// import lkTestHelpers from 'lk-test-helpers'
import moment from 'moment'

const Token = artifacts.require('Token')
const EtherToken = artifacts.require('EtherToken')
const OutcomeToken = artifacts.require('OutcomeToken')
const CentralizedOracleFactory = artifacts.require('CentralizedOracleFactory')
const Event = artifacts.require('Event')
const EventFactory = artifacts.require('EventFactory')
const CategoricalEvent = artifacts.require('CategoricalEvent')
const ScalarEvent = artifacts.require('ScalarEvent')
const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
const StandardMarket = artifacts.require('StandardMarket')
const StandardMarketFactory = artifacts.require('StandardMarketFactory')
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
    const standardMarketFactory = await StandardMarketFactory.new()
    const smpLoggerFactory = await StandardMarketWithPriceLoggerFactory.new()
    const futarchyFactory = await FutarchyFactory.new(eventFactory.address, smpLoggerFactory.address)

    const outcomeCount = 2
    const lowerBound = -100
    const upperBound = 100
    const fee = 0
    const tradingPeriod = moment.duration({days: 1}).asSeconds()
    const startDate = moment().unix() + moment.duration({seconds: 1}).asSeconds()

    const categoricalMarketFunding = 10 * 10 ** 18
    const scalarMarketFunding = 10 * 10 ** 18

    console.log('  *** create futarchy oracle')
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

    // create standard market w/ LMSR for categorical event
    console.log('  *** create categorical market')
    const categoricalEventMarketFee = 0
    const { logs: createCategoricalMarketLogs } = await standardMarketFactory.createMarket(
      categoricalEvent.address,
      lmsrMarketMaker.address,
      categoricalEventMarketFee
    )
    const { market: categoricalMarketAddress } = createCategoricalMarketLogs.find(
      e => e.event === 'StandardMarketCreation'
    ).args
    const categoricalMarket = StandardMarket.at(categoricalMarketAddress)

    const acceptedDeniedTokenAddresses = await categoricalEvent.getOutcomeTokens()
    const acceptedToken = OutcomeToken.at(acceptedDeniedTokenAddresses[0])
    const deniedToken = OutcomeToken.at(acceptedDeniedTokenAddresses[1])

    const acceptedLongShortTokenAddresses = await acceptedLongShortEvent.getOutcomeTokens()
    const acceptedLongToken = OutcomeToken.at(acceptedLongShortTokenAddresses[0])
    const acceptedShortToken = OutcomeToken.at(acceptedLongShortTokenAddresses[1])

    const deniedLongShortTokenAddresses = await deniedLongShortEvent.getOutcomeTokens()
    const deniedLongToken = OutcomeToken.at(deniedLongShortTokenAddresses[0])
    const deniedShortToken = OutcomeToken.at(deniedLongShortTokenAddresses[1])

    console.log('  *** fund the futarchy oracle (which funds the scalar markets)')
    await fundMarket(futarchyOracle, etherToken, scalarMarketFunding, creator)

    console.log('  *** fund the categorical market')
    await fundMarket(categoricalMarket, etherToken, categoricalMarketFunding, creator)

    console.log('')

    console.log('  *** buy LONG_ACCEPTED')
    console.log('')

    const buyAmt = 4 * 10 ** 18
    await etherToken.deposit({ value: buyAmt, from: longAcceptedBuyer })
    await etherToken.approve(categoricalEvent.address, buyAmt, { from: longAcceptedBuyer })

    await marketBuy(categoricalMarket, 0, buyAmt, longAcceptedBuyer)

    await marketBuy(marketForAccepted, 0, buyAmt, longAcceptedBuyer)

    await logBalances()
    await logOutcomeTokenCosts()

    async function marketBuy (market, outcomeTokenIndex, buyAmount, from) {
      const evtContract = Event.at(await market.eventContract())
      const collateralToken = Token.at(await evtContract.collateralToken())
      const cost = await getOutcomeTokenCost(
        market.address,
        outcomeTokenIndex,
        buyAmount
      )
      const fee = await getMarketFee(market, cost)
      const maxCost = cost + fee + 1000

      await collateralToken.approve(market.address, maxCost, { from })
      await market.buy(0, buyAmt, maxCost, { from })
    }

    async function fundMarket (market, collateralToken, fundingAmount, from) {
      await collateralToken.deposit({ value: fundingAmount, from })
      await collateralToken.approve(market.address, fundingAmount, { from })
      await market.fund(fundingAmount, { from })
    }

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

      console.log('    ACCEPTED | DENIED')
      console.log('    ------------------------------')
      await logTokenBalances(categoricalMarket.address)
      console.log('   ')

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
      const acceptedCost = await getOutcomeTokenCost(categoricalMarket.address, 0, 1e15)
      const deniedCost = await getOutcomeTokenCost(categoricalMarket.address, 1, 1e15)
      const longAcceptedCost = await getOutcomeTokenCost(marketForAccepted.address, 0, 1e15)
      const shortAcceptedCost = await getOutcomeTokenCost(marketForAccepted.address, 1, 1e15)
      const longDeniedCost = await getOutcomeTokenCost(marketForDenied.address, 0, 1e15)
      const shortDeniedCost = await getOutcomeTokenCost(marketForDenied.address, 1, 1e15)
      console.log('  Outcome Token Prices')
      console.log('  --------------------')
      console.log('  ACCEPTED:       ', acceptedCost / 10 ** 15)
      console.log('  DENIED:         ', deniedCost / 10 ** 15)
      console.log('  LONG_ACCEPTED:  ', longAcceptedCost / 10 ** 15)
      console.log('  SHORT_ACCEPTED: ', shortAcceptedCost / 10 ** 15)
      console.log('  LONG_DENIED:    ', longDeniedCost / 10 ** 15)
      console.log('  SHORT_DENIED:   ', shortDeniedCost / 10 ** 15)
      console.log('')
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
