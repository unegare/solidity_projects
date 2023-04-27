import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { fromRpcSig } from 'ethereumjs-util';
import { ethSigUtil } from 'eth-sig-util';
import { getDomain, domainType, Permit } from '../openzeppelin-contracts/test/helpers/eip712';
import secp256k1 from 'secp256k1';

import { signERC2612Permit } from 'eth-permit';

import {
  buildDelegationWithSigParams,
  buildPermitParams,
  getSignatureFromTypedData,
} from '../aave-v3-core/helpers/contracts-helpers';

import { HARDHAT_CHAINID, MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../aave-v3-core/helpers/constants';

//const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol";
//const IERC20_SOURCE = "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol:IERC20";
const IERC20_SOURCE = "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol:ERC20";
const IERC2612_SOURCE = "openzeppelin-contracts/contracts/interfaces/IERC2612.sol:IERC2612";
const AAVE_POOL_SOURCE = "aave-v3-core/contracts/protocol/pool/Pool.sol:Pool";
const AAVE_VARIABLE_DEBT_TOKEN = "aave-v3-core/contracts/protocol/tokenization/VariableDebtToken.sol:VariableDebtToken";

const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const WBTCUSDT = '0x9Db9e0e53058C89e5B94e29621a205198648425B';

const WBTC_OWNER = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28'; //'0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656';
const USDT_OWNER = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';
const USDC_OWNER = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503'; // '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; 

const AAVE_POOL = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

describe("AaveWrap", function () {
  const get_erc20 = async (addr, signer) => {
    const erc20 = await ethers.getContractAt(IERC20_SOURCE, addr, signer);
    return erc20.connect(signer);
  };
  const get_erc2612 = async (addr, signer) => {
    const erc2612 = await ethers.getContractAt(IERC2612_SOURCE, addr, signer);
    return erc2612.connect(signer);
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
  it('AaveWrap_contract_getCreditDelegateWithSig', async function() {
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
    const signer_secretKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // zero hardhat acc
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

    console.log('getCreditDelegateWithSig:', await aaveWrap.connect(signer).getCreditDelegateWithSig({
      base: {
        lend_token: WBTC,
        lend_amount, 
        borrow_token: USDT,
        borrow_amount,
      },
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
  it('AaveWrap_contract_getCreditWithSigs', async function() {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_OWNER],
    });

    const lend_amount = ethers.BigNumber.from(1_000_000).mul(ethers.BigNumber.from(10_000));
    const borrow_amount = ethers.BigNumber.from(100_000_000).mul(ethers.BigNumber.from(1));

    const signer = await (async () => {
      const [owner] = await ethers.getSigners();
      const usdc_owner = await ethers.getSigner(USDC_OWNER);
      const usdc = await get_erc20(USDC, usdc_owner);
      const tx = await usdc.transfer(owner.address, lend_amount.mul(ethers.BigNumber.from(10)));
      await tx.wait();
      return owner;
    })();
    const signer_secretKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // zero hardhat acc
    const AaveWrap = await ethers.getContractFactory("AaveWrap");
    const aaveWrap = await AaveWrap.deploy();
    console.log('aaveWrap.address:', aaveWrap.address);

    const wbtc = await get_erc20(WBTC, signer);
    const usdt = await get_erc20(USDT, signer);
    const usdc = await get_erc20(USDC, signer);
    const usdc_2612 = await get_erc2612(USDC, signer);

    const get_balances = async () => {
      const wbtc_balance = await wbtc.balanceOf(signer.address);
      const usdt_balance = await usdt.balanceOf(signer.address);
      const usdc_balance = await usdc.balanceOf(signer.address);
      return {wbtc_balance, usdt_balance, usdc_balance};
    };
    
    console.log('signer.address: ', signer.address);

    const {
      wbtc_balance: wbtc_balance_old,
      usdt_balance: usdt_balance_old,
      usdc_balance: usdc_balance_old,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_old);
    console.log('usdt balance: ', usdt_balance_old);
    console.log('usdc balance: ', usdc_balance_old);

    const aave_pool = await get_aave_pool(AAVE_POOL, signer);
    const variableDebtUSDT = await get_variableDebtToken(
      (await aave_pool.getReserveData(USDT)).variableDebtTokenAddress,
      signer
    );
    const variableDebtWBTC = await get_variableDebtToken(
      (await aave_pool.getReserveData(WBTC)).variableDebtTokenAddress,
      signer
    );

    const usdc_2612_nonce = await usdc_2612.nonces(signer.address);

    const SigUtils = await ethers.getContractFactory('SigUtils');
    const sigUtils = await SigUtils.deploy(Buffer.from('0x06c37168a7db5138defc7866392bb87a741f9b3d104deb5094588ce041cae335'.substring(2, 66), 'hex')); // USDC

    console.log(lend_amount);

    const usdc_permit_params = {
      owner: signer.address,
      spender: aaveWrap.address,
      value: lend_amount,
      nonce: await usdc_2612.nonces(signer.address),
      deadline: ethers.BigNumber.from(((1n<<256n)-1n).toString()),
    };
    const usdc_permit_hash_to_sign = await sigUtils.getTypedDataHash(usdc_permit_params);
    console.log({usdc_permit_hash_to_sign});
    const usdc_permit_raw_signature = secp256k1.ecdsaSign(
      new Uint8Array(Buffer.from(usdc_permit_hash_to_sign.substring(2, 66), 'hex')),
      new Uint8Array(Buffer.from(signer_secretKey.substring(2, 66), 'hex')),
    );
    const usdc_permit_signature = Buffer.concat([usdc_permit_raw_signature.signature, Buffer.from([usdc_permit_raw_signature.recid])]);
    const permit_signature = fromRpcSig(usdc_permit_signature);


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

    const delegate_signature = getSignatureFromTypedData(signer_secretKey, msgParams);

//    await variableDebtUSDT.delegationWithSig(signer.address, aaveWrap.address, permitAmount, expiration, v, r, s);
//    console.log('approveDelegation:', await variableDebtUSDT.approveDelegation(aaveWrap.address, borrow_amount));

    console.log('getCreditWithSigs:', await aaveWrap.connect(signer).getCreditWithSigs({
      base: {
        lend_token: USDC,
        lend_amount, 
        borrow_token: USDT,
        borrow_amount,
      },
      lend_approve: {
        v: permit_signature.v,
        r: permit_signature.r,
        s: permit_signature.s,
      },
      borrow_delegation: {
        v: delegate_signature.v,
        r: delegate_signature.r,
        s: delegate_signature.s,
      },
    }));

    const {
      wbtc_balance: wbtc_balance_new,
      usdt_balance: usdt_balance_new,
      usdc_balance: usdc_balance_new,
    } = await get_balances();
    console.log('wbtc balance: ', wbtc_balance_new);
    console.log('usdt balance: ', usdt_balance_new);
    console.log('usdc balance: ', usdc_balance_new);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [USDC_OWNER],
    });
  });
  it('AaveWrap_contract_USDC_other', async function() {
    // not working
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_OWNER],
    });

    const [owner] = await ethers.getSigners();

    const USDC_Mod = await ethers.getContractFactory('FiatTokenV2_1');
    const usdc_mod = USDC_Mod.deploy();
    {
      let tx = await usdc_mod.initialize(
        "USD Coin", "USDC", "USD", 6,
        owner.address, owner.address, owner.address, owner.address
      );
      await tx.wait();
    }
    {
      let tx = await usdc_mod.initializeV2("USDC");
      await tx.wait();
    }
    {
      let tx = await usdc_mod.initializeV2_1(owner.address);
      await tx.wait();
    }
    {
      let tx = await usdc_mod.mint(owner.address, ethers.BigNumber.from(1_000_000).mul(ethers.BigNumber.from(1000_000_000)));
      await tx.wait();
    }

    console.log('balanceOf: ', await usdc_mod.balanceOf(owner.address));
    
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [USDC_OWNER],
    });
  });
  it('general_permit_test', async function() {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_OWNER],
    });

    const signer_secretKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const signer = new ethers.Wallet(signer_secretKey); // zero hardhat acc

    const usdc_owner = await ethers.getSigner(USDC_OWNER);

    const usdc = await get_erc20(USDC, usdc_owner);
    const usdc_2612 = await get_erc2612(USDC, usdc_owner);
    const USDC_DOMAIN_SEPARATOR = '0x06c37168a7db5138defc7866392bb87a741f9b3d104deb5094588ce041cae335';

    const lend_amount = ethers.BigNumber.from(1_000_000).mul(ethers.BigNumber.from(100_000));

    {
      const tx = await usdc.transfer(signer.address, lend_amount);
      await tx.wait();
      console.log('signer USDC balanceOf:', await usdc.balanceOf(signer.address));
    }

    const SigUtils = await ethers.getContractFactory('SigUtils');
    const sigUtils = await SigUtils.deploy(USDC_DOMAIN_SEPARATOR);
    const params = {
      owner: signer.address,
      spender: usdc_owner.address,
      value: lend_amount,
      nonce: await (async () => {
        const nonce = (await usdc_2612.nonces(signer.address)).toNumber();
        console.log('nonce:', nonce);
        return nonce;
      })(),
      deadline: MAX_UINT_AMOUNT,
    };
    console.log('params:', params);

    const hash = await sigUtils.getTypedDataHash(params);

    const permit_signature = (() => {
      const raw_sig_obj = secp256k1.ecdsaSign(
        new Uint8Array(Buffer.from(hash.substring(2, 66), 'hex')),
        new Uint8Array(Buffer.from(signer_secretKey.substring(2, 66), 'hex'))
      );
      const raw_sig = Buffer.concat([raw_sig_obj.signature, Buffer.from([raw_sig_obj.recid])]);
      const sig_obj = fromRpcSig(raw_sig);
      return sig_obj;
    })();
    console.log({permit_signature});

    console.log('allowance before:', await usdc.allowance(signer.address, usdc_owner.address));

    const tx = await usdc_2612.permit(signer.address, usdc_owner.address, lend_amount, MAX_UINT_AMOUNT, permit_signature.v, permit_signature.r, permit_signature.s);
    await tx.wait();

    console.log('allowance after:', await usdc.allowance(signer.address, usdc_owner.address));
    console.log('success');

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [USDC_OWNER],
    });
  });
});
