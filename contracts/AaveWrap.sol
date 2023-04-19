//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "hardhat/console.sol";
//import "../openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import '../openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol';
import "../aave-v3-core/contracts/protocol/pool/Pool.sol";
import {VariableDebtToken} from "../aave-v3-core/contracts/protocol/tokenization/VariableDebtToken.sol";

contract AaveWrap {
  using SafeERC20 for IERC20;

  IPool constant aavePool = IPool(0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2);

  constructor() {
  }

  struct GetCreditParams {
    IERC20 lend_token;
    uint lend_amount;
    IERC20 borrow_token;
    uint borrow_amount;
  }

  function getCredit(GetCreditParams calldata params) external {
//    console.log('before safeTransferFrom');
//    console.log('allowance:   ', params.lend_token.allowance(msg.sender, address(this)));
//    console.log('lend_amount: ', params.lend_amount);
    params.lend_token.safeTransferFrom(msg.sender, address(this), params.lend_amount); // funds must be on the balance of caller
//    console.log('before approve');
    params.lend_token.safeApprove(address(aavePool), params.lend_amount);
//    console.log('before supply');
//    {
//      (uint tcb, uint tdb, uint abb, uint clt, uint ltv, uint hf) = aavePool.getUserAccountData(msg.sender);
//      console.log('tcb:', tcb);
//    }
    aavePool.supply(address(params.lend_token), params.lend_amount, msg.sender, 0);
//    {
//      (uint tcb, uint tdb, uint abb, uint clt, uint ltv, uint hf) = aavePool.getUserAccountData(msg.sender);
//      console.log('tcb:', tcb);
//    }
//    console.log('before borrow');
    aavePool.borrow(address(params.borrow_token), params.borrow_amount, 2, 0, msg.sender);
    params.borrow_token.safeTransfer(msg.sender, params.borrow_amount);
  }

  struct SigParams {
    uint8 v;
    bytes32 r;
    bytes32 s;
  }

  struct GetCreditDelegateWithSigParams {
    IERC20 lend_token;
    uint lend_amount;
    IERC20 borrow_token;
    uint borrow_amount;
    SigParams borrow_delegation;
  }

  function getCreditDelegateWithSig(GetCreditDelegateWithSigParams calldata params) external {
    params.lend_token.safeTransferFrom(msg.sender, address(this), params.lend_amount); // funds must be on the balance of caller
    params.lend_token.safeApprove(address(aavePool), params.lend_amount);
    aavePool.supply(address(params.lend_token), params.lend_amount, msg.sender, 0);

    address vbta = aavePool.getReserveData(address(params.borrow_token)).variableDebtTokenAddress;
    VariableDebtToken(vbta).delegationWithSig(
      msg.sender, address(this), params.borrow_amount, uint(int(-1)),
      params.borrow_delegation.v, params.borrow_delegation.r, params.borrow_delegation.s
    );

    aavePool.borrow(address(params.borrow_token), params.borrow_amount, 2, 0, msg.sender);
    params.borrow_token.safeTransfer(msg.sender, params.borrow_amount);
  }
}
