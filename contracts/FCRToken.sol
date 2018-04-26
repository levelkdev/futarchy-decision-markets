pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

contract FCRToken is MintableToken {
	string public constant name = "FCR Token";
	string public constant symbol = "FCR";
	uint8 public constant decimals = 18;
}
