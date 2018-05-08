pragma solidity ^0.4.18;

import '@gnosis.pm/gnosis-core-contracts/contracts/MarketMakers/LMSRMarketMaker.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Markets/StandardMarketFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Events/EventFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Tokens/EtherToken.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/CentralizedOracleFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/FutarchyOracle.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/FutarchyOracleFactory.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract TokenRatioFutarchy is Ownable {
  using SafeMath for uint256;

  // Storage
  CategoricalEvent public _assetTokenCollateralEvent;
  CategoricalEvent public _genericTokenCollateralEvent;

  StandardMarket public _assetTokenMarket;
  StandardMarket public _genericTokenMarket;

  StandardToken public _assetToken;
  StandardToken public _genericToken;

  Oracle public _centralizedOracle;
  LMSRMarketMaker public _marketMaker;

  EventFactory public _eventFactory;
  StandardMarketFactory public _marketFactory;

  uint256 public _endDate;

  function TokenRatioFutarchy (
    uint256 duration,
    StandardToken assetToken,
    StandardToken genericToken,
    CentralizedOracleFactory centralizedOracleFactory,
    EventFactory eventFactory,
    StandardMarketFactory marketFactory,
    LMSRMarketMaker marketMaker,
    bytes ipfsHash
  ) public {
    require(duration > 0);

    _assetToken = assetToken;
    _genericToken = genericToken;
    _centralizedOracle = centralizedOracleFactory.createCentralizedOracle(ipfsHash);
    _eventFactory = eventFactory;
    _marketMaker = marketMaker;
    _marketFactory = marketFactory;
    _endDate = now.add(duration);

    createAssetTokenMarket(0);
    createGenericTokenMarket(0);
  }

  function createAssetTokenMarket(uint24 fee) public  {
    require(address(_assetTokenMarket) == 0);
    createAssetTokenCollateralEvent();
    _assetTokenMarket = _marketFactory.createMarket(_assetTokenCollateralEvent, _marketMaker, fee);
  }

  function createGenericTokenMarket(uint24 fee) public  {
    require(address(_genericTokenMarket) == 0);
    createGenericTokenCollateralEvent();
    _genericTokenMarket = _marketFactory.createMarket(_genericTokenCollateralEvent, _marketMaker, fee);
  }

  function fund(uint funding) public onlyOwner {
    require (
          _assetTokenCollateralEvent.collateralToken().transferFrom(msg.sender, this, funding)
       && _genericTokenCollateralEvent.collateralToken().transferFrom(msg.sender, this, funding)
       && _assetTokenCollateralEvent.collateralToken().approve(_assetTokenMarket, funding)
       && _genericTokenCollateralEvent.collateralToken().approve(_genericTokenMarket, funding)
    );

    _assetTokenMarket.fund(funding);
    _genericTokenMarket.fund(funding);
  }

  function setOutcome() public  {

  }

  function createAssetTokenCollateralEvent() internal {
    require(address(_assetTokenCollateralEvent) == 0);
    _assetTokenCollateralEvent = _eventFactory.createCategoricalEvent(
      _assetToken,
      _centralizedOracle,
      2
    );
  }

  function createGenericTokenCollateralEvent() internal {
    require(address(_genericTokenCollateralEvent) == 0);
    _genericTokenCollateralEvent = _eventFactory.createCategoricalEvent(
      _genericToken,
      _centralizedOracle,
      2
    );
  }
}
