import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

import {
  buildDelegationWithSigParams,
  getSignatureFromTypedData,
} from '../aave-v3-core/helpers/contracts-helpers';
import { HARDHAT_CHAINID, MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../aave-v3-core/helpers/constants';

//const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol";
const IERC20_SOURCE = "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol:IERC20";
const AAVE_POOL_SOURCE = "aave-v3-core/contracts/protocol/pool/Pool.sol:Pool";
const AAVE_VARIABLE_DEBT_TOKEN = "aave-v3-core/contracts/protocol/tokenization/VariableDebtToken.sol:VariableDebtToken";

const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const WBTCUSDT = '0x9Db9e0e53058C89e5B94e29621a205198648425B';

const WBTC_OWNER = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28'; //'0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656';
const USDT_OWNER = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';

const AAVE_POOL = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

describe("AaveWrap", function () {
  const get_erc20 = async (addr, signer) => {
    const erc20 = await ethers.getContractAt(IERC20_SOURCE, addr, signer);
    return erc20.connect(signer);
  };
  const get_aave_pool = async (addr, signer) => {
    const aave_pool = await ethers.getContractAt(AAVE_POOL_SOURCE, addr, signer);
    return aave_pool.connect(signer);
  };
  const get_variableDebtToken = async (addr, signer) => {
    const vbt = await ethers.getContractAt(AAVE_VARIABLE_DEBT_TOKEN, addr, signer);
    return vbt.connect(signer);
  };

  it('aave_general', async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WBTC_OWNER],
    });

    const signer = await ethers.getSigner(WBTC_OWNER);

    const wbtc = await get_erc20(WBTC, signer);
    const usdt = await get_erc20(USDT, signer);

    const get_balances = async () => {
      const wbtc_balance = await wbtc.balanceOf(signer.address);
      const usdt_balance = await usdt.balanceOf(signer.address);
      return {wbtc_balance, usdt_balance};
    };
    
    console.log('signer.address: ', signer.address);
    const {
      wbtc_balance: wbtc_balance_old,
      usdt_balance: usdt_balance_old,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_old);
    console.log('usdt balance: ', usdt_balance_old);


    const aave_pool = await get_aave_pool(AAVE_POOL, signer);
    
    console.log('approve:', await wbtc.approve(aave_pool.address, ethers.BigNumber.from(100_000_000).mul(ethers.BigNumber.from(10))));

    console.log('supply:', await aave_pool.supply(
      WBTC,
      ethers.BigNumber.from(100_000_000).mul(ethers.BigNumber.from(10)),
      signer.address,
      ethers.BigNumber.from(0)
    ));
    const tx_borrow = await aave_pool.borrow(
      USDT,
      ethers.BigNumber.from(1_000_000).mul(ethers.BigNumber.from(10_000)),
      ethers.BigNumber.from(2),
      ethers.BigNumber.from(0),
      signer.address
    );
    const receipt_borrow = await tx_borrow.wait();
    console.log('borrow:', receipt_borrow.events);

    const {
      wbtc_balance: wbtc_balance_new,
      usdt_balance: usdt_balance_new,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_new);
    console.log('usdt balance: ', usdt_balance_new);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [WBTC_OWNER],
    });
  });
  it('AaveWrap_contract_getCredit_simple', async function() {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WBTC_OWNER],
    });

    const signer = await ethers.getSigner(WBTC_OWNER);
    const AaveWrap = await ethers.getContractFactory("AaveWrap");
    const aaveWrap = await AaveWrap.deploy();

    const wbtc = await get_erc20(WBTC, signer);
    const usdt = await get_erc20(USDT, signer);

    const get_balances = async () => {
      const wbtc_balance = await wbtc.balanceOf(signer.address);
      const usdt_balance = await usdt.balanceOf(signer.address);
      return {wbtc_balance, usdt_balance};
    };
    
    console.log('signer.address: ', signer.address);
    const {
      wbtc_balance: wbtc_balance_old,
      usdt_balance: usdt_balance_old,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_old);
    console.log('usdt balance: ', usdt_balance_old);

    const aave_pool = await get_aave_pool(AAVE_POOL, signer);
    const variableDebtUSDT = await get_variableDebtToken(
      (await aave_pool.getReserveData(USDT)).variableDebtTokenAddress,
      signer
    );


    const borrow_amount = ethers.BigNumber.from(1_000_000).mul(ethers.BigNumber.from(10_000));
    const lend_amount = ethers.BigNumber.from(100_000_000).mul(ethers.BigNumber.from(10));

    console.log('approve:', await wbtc.approve(aave_pool.address, lend_amount));
    console.log('approve:', await wbtc.approve(aaveWrap.address, lend_amount));
    console.log('approveDelegation:', await variableDebtUSDT.approveDelegation(aaveWrap.address, borrow_amount));

    console.log('getCredit:', await aaveWrap.connect(signer).getCredit({
      lend_token: WBTC,
      lend_amount, 
      borrow_token: USDT,
      borrow_amount,
    }));

    const {
      wbtc_balance: wbtc_balance_new,
      usdt_balance: usdt_balance_new,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_new);
    console.log('usdt balance: ', usdt_balance_new);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [WBTC_OWNER],
    });
  });
  it('AaveWrap_contract_getCreditWithSig', async function() {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WBTC_OWNER],
    });

    const borrow_amount = ethers.BigNumber.from(1_000_000).mul(ethers.BigNumber.from(10_000));
    const lend_amount = ethers.BigNumber.from(100_000_000).mul(ethers.BigNumber.from(10));

    const signer = await (async () => {
      const [owner] = await ethers.getSigners();
      const wbtc_owner = await ethers.getSigner(WBTC_OWNER);
      const wbtc = await get_erc20(WBTC, wbtc_owner);
      const tx = await wbtc.transfer(owner.address, lend_amount.mul(ethers.BigNumber.from(10)));
      await tx.wait();
      return owner;
    })();
    const signer_secretKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const AaveWrap = await ethers.getContractFactory("AaveWrap");
    const aaveWrap = await AaveWrap.deploy();

    const wbtc = await get_erc20(WBTC, signer);
    const usdt = await get_erc20(USDT, signer);

    const get_balances = async () => {
      const wbtc_balance = await wbtc.balanceOf(signer.address);
      const usdt_balance = await usdt.balanceOf(signer.address);
      return {wbtc_balance, usdt_balance};
    };
    
    console.log('signer.address: ', signer.address);
    const {
      wbtc_balance: wbtc_balance_old,
      usdt_balance: usdt_balance_old,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_old);
    console.log('usdt balance: ', usdt_balance_old);

    const aave_pool = await get_aave_pool(AAVE_POOL, signer);
    const variableDebtUSDT = await get_variableDebtToken(
      (await aave_pool.getReserveData(USDT)).variableDebtTokenAddress,
      signer
    );

//    console.log('approve:', await wbtc.approve(aave_pool.address, lend_amount));
    console.log('approve:', await wbtc.approve(aaveWrap.address, lend_amount));

    const chainId = hre.network.config.chainId || HARDHAT_CHAINID;
    const EIP712_REVISION = '1';
    const delegatee = aaveWrap.address;
    const nonce = (await variableDebtUSDT.nonces(signer.address)).toNumber();
    const expiration = MAX_UINT_AMOUNT;
    const permitAmount = borrow_amount;
    const msgParams = buildDelegationWithSigParams(
      chainId,
      variableDebtUSDT.address,
      EIP712_REVISION,
      await variableDebtUSDT.name(),
      delegatee,
      nonce,
      expiration,
      permitAmount.toString()
    );

    const { v, r, s } = getSignatureFromTypedData(signer_secretKey, msgParams);

//    await variableDebtUSDT.delegationWithSig(signer.address, aaveWrap.address, permitAmount, expiration, v, r, s);
//    console.log('approveDelegation:', await variableDebtUSDT.approveDelegation(aaveWrap.address, borrow_amount));

    console.log('getCredit:', await aaveWrap.connect(signer).getCreditDelegateWithSig({
      lend_token: WBTC,
      lend_amount, 
      borrow_token: USDT,
      borrow_amount,
      borrow_delegation: {
        v,
        r,
        s,
      },
    }));

    const {
      wbtc_balance: wbtc_balance_new,
      usdt_balance: usdt_balance_new,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_new);
    console.log('usdt balance: ', usdt_balance_new);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [WBTC_OWNER],
    });
  });
});
