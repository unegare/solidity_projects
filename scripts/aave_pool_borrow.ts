import { ethers } from "hardhat";

//import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

const IERC20_SOURCE = "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol:IERC20";
//const IERC20_SOURCE = "@openzeppelin/contracts/token/ERC20/IERC20.sol";
const AAVE_POOL_SOURCE = "aave-v3-core/contracts/protocol/pool/Pool.sol";

const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const WBTCUSDT = '0x9Db9e0e53058C89e5B94e29621a205198648425B';

const WBTC_OWNER = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28'; //'0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656';
const USDT_OWNER = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';

const AAVE_POOL = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

async function main() {
  const get_erc20 = async (addr, signer) => {
    const erc20 = await ethers.getContractAt(IERC20_SOURCE, addr, signer);
    return erc20.connect(signer);
  };
  const get_aave_pool = async (addr, signer) => {
    const aave_pool = await ethers.getContractAt(AAVE_POOL_SOURCE, addr, signer);
    return aave_pool.connect(signer);
  };

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WBTC_OWNER],
  });

  const wbtc_owner = await ethers.getSigner(WBTC_OWNER);
  const wbtc = await get_erc20(WBTC, wbtc_owner);
  const usdt = await get_erc20(USDT, wbtc_owner);

  const aave_pool = await get_aave_pool(AAVE_POOL, wbtc_owner);

  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [WBTC_OWNER],
  });
}

main()
  .catch(el => void console.error('ERROR:', el))
