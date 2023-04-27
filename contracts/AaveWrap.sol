//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "hardhat/console.sol";
//import "../openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../openzeppelin-contracts/contracts/interfaces/IERC2612.sol";
import '../openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol';
import "../aave-v3-core/contracts/protocol/pool/Pool.sol";
import {VariableDebtToken} from "../aave-v3-core/contracts/protocol/tokenization/VariableDebtToken.sol";

contract AaveWrap {
  using SafeERC20 for IERC20;
//  using SafeERC20 for IERC2612;

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
    GetCreditParams base;
    SigParams borrow_delegation;
  }

  function getCreditDelegateWithSig(GetCreditDelegateWithSigParams calldata params) external {
    params.base.lend_token.safeTransferFrom(msg.sender, address(this), params.base.lend_amount); // funds must be on the balance of caller
    params.base.lend_token.safeApprove(address(aavePool), params.base.lend_amount);
    aavePool.supply(address(params.base.lend_token), params.base.lend_amount, msg.sender, 0);

    address vbta = aavePool.getReserveData(address(params.base.borrow_token)).variableDebtTokenAddress;
    VariableDebtToken(vbta).delegationWithSig(
      msg.sender, address(this), params.base.borrow_amount, uint(int(-1)),
      params.borrow_delegation.v, params.borrow_delegation.r, params.borrow_delegation.s
    );

    aavePool.borrow(address(params.base.borrow_token), params.base.borrow_amount, 2, 0, msg.sender);
    params.base.borrow_token.safeTransfer(msg.sender, params.base.borrow_amount);
  }

  struct GetCreditWithSigsParams {
    GetCreditParams base;
    SigParams lend_approve;
    SigParams borrow_delegation;
  }

  function getCreditWithSigs(GetCreditWithSigsParams calldata params) external {
    console.log('balanceOf:  ', params.base.lend_token.balanceOf(msg.sender));
    console.log('lend_amount:', params.base.lend_amount);
    console.log('allowance:', params.base.lend_token.allowance(msg.sender, address(this)));
    console.log('nonces:', IERC2612(address(params.base.lend_token)).nonces(msg.sender));
//    console.log('version:', IERC2612(address(params.base.lend_token)).version());
    IERC2612(address(params.base.lend_token)).permit(
      msg.sender, address(this), params.base.lend_amount, uint(int(-1)),
      params.lend_approve.v, params.lend_approve.r, params.lend_approve.s
    );
    console.log('allowance:', params.base.lend_token.allowance(msg.sender, address(this)));

    params.base.lend_token.safeTransferFrom(msg.sender, address(this), params.base.lend_amount);
    params.base.lend_token.safeApprove(address(aavePool), params.base.lend_amount);
    aavePool.supply(address(params.base.lend_token), params.base.lend_amount, msg.sender, 0);

    address vbta = aavePool.getReserveData(address(params.base.borrow_token)).variableDebtTokenAddress;
    VariableDebtToken(vbta).delegationWithSig(
      msg.sender, address(this), params.base.borrow_amount, uint(int(-1)),
      params.borrow_delegation.v, params.borrow_delegation.r, params.borrow_delegation.s
    );

    aavePool.borrow(address(params.base.borrow_token), params.base.borrow_amount, 2, 0, msg.sender);
    params.base.borrow_token.safeTransfer(msg.sender, params.base.borrow_amount);
  }
}
