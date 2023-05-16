
async function main() {
    const UniV3DataLoader = await hre.ethers.getContractFactory('UniV3DataLoader');
    const uniV3DataLoader = await UniV3DataLoader.deploy();

    // state loading is splitted into steps
    for (let limit = 50; limit <= 300; limit += 50) {
      const arr = await uniV3DataLoader.load('0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35', limit, limit == 300);
      console.log(arr);
    }
}

main()
  .catch(err => void console.error(err))
