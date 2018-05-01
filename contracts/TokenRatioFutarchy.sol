pragma solidity ^0.4.18;

import '@gnosis.pm/gnosis-core-contracts/contracts/MarketMakers/LMSRMarketMaker.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Markets/StandardMarketFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Events/EventFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Tokens/EtherToken.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/CentralizedOracleFactory.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract TokenRatioFutarchy {
  using SafeMath for uint256;

  // Events
  event CategoricalEventCreation(CategoricalEvent categoricalEvent, StandardToken collateralToken);
  event MarketCreation(CategoricalEvent categoricalEvent, MarketMaker marketMaker, uint24 fee);

  // Storage
  CategoricalEvent public _assetTokenCollateralEvent;
  CategoricalEvent public _genericTokenCollateralEvent;

  StandardToken public _assetToken;
  StandardToken public _genericToken;

  Oracle public _centralizedOracle;
  LMSRMarketMaker public _marketMaker;

  EventFactory public _eventFactory;
  StandardMarketFactory public _marketFactory;
  uint256 public _endDate;

  function TokenRatioFutarchy(
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
    _endDate = now.add(duration);
  }

  function createAssetTokenCollateralEvent() public {
    require(address(_assetTokenCollateralEvent) == 0);
    _assetTokenCollateralEvent = _eventFactory.createCategoricalEvent(
      _assetToken,
      _centralizedOracle,
      2
    );
    CategoricalEventCreation(_assetTokenCollateralEvent, _assetToken);
  }

  function createGenericTokenCollateralEvent() public {
    require(address(_genericTokenCollateralEvent) == 0);
    _genericTokenCollateralEvent = _eventFactory.createCategoricalEvent(
      _genericToken,
      _centralizedOracle,
      2
    );
    CategoricalEventCreation(_genericTokenCollateralEvent, _genericToken);
  }

  function createAssetTokenMarket(uint24 fee) public {
    _marketFactory.createMarket(_assetTokenCollateralEvent, _marketMaker, fee);
    MarketCreation(_assetTokenCollateralEvent, _marketMaker, fee);
  }

  function createGenericTokenMarket(uint24 fee) public {
    _marketFactory.createMarket(_genericTokenCollateralEvent, _marketMaker, fee);
    MarketCreation(_genericTokenCollateralEvent, _marketMaker, fee);
  }

}
